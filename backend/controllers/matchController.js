const Match = require("../models/Match");
const Team = require("../models/Team");
const Flight = require("../models/Flight");
const { asyncHandler, badRequest, notFound, isBlank } = require("../middleware/errorHandler");
const { findConflicts, findAllConflicts } = require("../utils/cppEngine");

const FIELDS = ["teamA", "teamB", "date", "startTime", "endTime", "venue", "city", "status"];
const STATUSES = ["Scheduled", "Cancelled", "Completed"];
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/; // 2026-10-18
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/; // 18:00

// "18:00" -> 1080. Used ONLY to check that end time is after start time.
// The real scheduling algorithm (interval overlap) runs in C++: cpp-engine/TravelAndScheduleEngine.cpp
function toMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

// Only copy known fields from the request.
function pickMatchFields(body) {
  const data = {};
  FIELDS.forEach((f) => {
    if (body[f] !== undefined) data[f] = body[f];
  });
  return data;
}

async function validateMatch(data) {
  if (isBlank(data.teamA)) throw badRequest("Team A is required");
  if (isBlank(data.teamB)) throw badRequest("Team B is required");
  if (String(data.teamA) === String(data.teamB)) throw badRequest("Team A and Team B cannot be the same team");
  if (isBlank(data.date)) throw badRequest("Date is required");
  if (!DATE_REGEX.test(data.date)) throw badRequest("Date must be in YYYY-MM-DD format");
  if (isBlank(data.startTime)) throw badRequest("Start time is required");
  if (isBlank(data.endTime)) throw badRequest("End time is required");
  if (!TIME_REGEX.test(data.startTime) || !TIME_REGEX.test(data.endTime)) {
    throw badRequest("Times must be in HH:MM (24-hour) format");
  }
  if (toMinutes(data.endTime) <= toMinutes(data.startTime)) {
    throw badRequest("End time must be after start time");
  }
  if (!STATUSES.includes(data.status)) throw badRequest("Status must be Scheduled, Cancelled or Completed");

  const [teamA, teamB] = await Promise.all([Team.findById(data.teamA), Team.findById(data.teamB)]);
  if (!teamA || !teamB) throw notFound("Team not found");
}

// Throws a 400 error if either team already has an overlapping match.
// ignoreId is used when EDITING a match, so it does not conflict with itself.
async function checkConflict(data, ignoreId) {
  const teamIds = [data.teamA, data.teamB];

  // Step 1 (database): only matches on the SAME DATE that involve EITHER team.
  // (Cancelled matches are ignored - they no longer block a team.)
  const query = {
    date: data.date,
    status: "Scheduled",
    $or: [{ teamA: { $in: teamIds } }, { teamB: { $in: teamIds } }],
  };
  if (ignoreId) query._id = { $ne: ignoreId };
  const sameDayMatches = await Match.find(query).populate("teamA teamB");

  // Step 2 (C++ engine): which of those matches overlap the new time range?
  // The engine applies:  newStart < existingEnd && newEnd > existingStart
  const conflictIds = await findConflicts(data.startTime, data.endTime, sameDayMatches);

  if (conflictIds.length > 0) {
    const existing = sameDayMatches.find((m) => String(m._id) === conflictIds[0]);
    // Find out which of OUR two teams is the busy one, for a clear message.
    const busyTeam = [existing.teamA, existing.teamB].find(
      (t) => String(t._id) === String(data.teamA) || String(t._id) === String(data.teamB)
    );
    throw badRequest(`Scheduling conflict: ${busyTeam.teamName} already has a match during this time.`);
  }
}

function todayString() {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

// GET /api/matches  or  /api/matches?upcoming=true
exports.getMatches = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.upcoming === "true") {
    filter.status = "Scheduled";
    filter.date = { $gte: todayString() }; // "YYYY-MM-DD" strings compare correctly
  }
  const matches = await Match.find(filter).sort({ date: 1, startTime: 1 }).populate("teamA teamB");
  res.json({ success: true, data: matches });
});

// POST /api/matches
exports.createMatch = asyncHandler(async (req, res) => {
  const data = { status: "Scheduled", ...pickMatchFields(req.body) };
  await validateMatch(data);
  if (data.status === "Scheduled") await checkConflict(data);

  const match = await Match.create(data);
  const saved = await Match.findById(match._id).populate("teamA teamB");
  res.status(201).json({ success: true, message: "Match scheduled successfully.", data: saved });
});

// PUT /api/matches/:id  (reschedule, cancel, edit venue...)
exports.updateMatch = asyncHandler(async (req, res) => {
  const match = await Match.findById(req.params.id);
  if (!match) throw notFound("Match not found");

  // Start from the saved values, overwrite with whatever the client sent.
  const data = {};
  FIELDS.forEach((f) => {
    data[f] = req.body[f] !== undefined ? req.body[f] : match[f];
  });

  await validateMatch(data);
  if (data.status === "Scheduled") await checkConflict(data, match._id); // re-check on reschedule

  match.set(data);
  await match.save();
  const saved = await Match.findById(match._id).populate("teamA teamB");
  res.json({ success: true, message: "Match updated successfully.", data: saved });
});

// DELETE /api/matches/:id
exports.deleteMatch = asyncHandler(async (req, res) => {
  const match = await Match.findById(req.params.id);
  if (!match) throw notFound("Match not found");
  await Flight.deleteMany({ matchId: match._id }); // its travel options go too
  await match.deleteOne();
  res.json({ success: true, data: { message: "Match deleted" } });
});

// GET /api/matches/conflicts  -> used by the dashboard.
// The C++ engine compares every pair of scheduled matches.
// (Normally 0, because conflicting matches are rejected when created.)
exports.getConflicts = asyncHandler(async (req, res) => {
  const matches = await Match.find({ status: "Scheduled" });
  const pairs = await findAllConflicts(matches);
  res.json({ success: true, data: { count: pairs.length, pairs } });
});
