const Team = require("../models/Team");
const Player = require("../models/Player");
const Match = require("../models/Match");
const { asyncHandler, badRequest, notFound, isBlank } = require("../middleware/errorHandler");

function validateTeam(body) {
  if (isBlank(body.teamName)) throw badRequest("Team name is required");
  if (isBlank(body.city)) throw badRequest("City is required");
}

// Only copy the fields we allow (ignores anything extra the client sends).
function pickTeamFields(body) {
  return { teamName: body.teamName, city: body.city, sport: body.sport, coach: body.coach };
}

exports.getTeams = asyncHandler(async (req, res) => {
  const teams = await Team.find().sort({ teamName: 1 });
  res.json({ success: true, data: teams });
});

exports.getTeam = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.id);
  if (!team) throw notFound("Team not found");
  res.json({ success: true, data: team });
});

exports.createTeam = asyncHandler(async (req, res) => {
  validateTeam(req.body);
  const team = await Team.create(pickTeamFields(req.body));
  res.status(201).json({ success: true, data: team });
});

exports.updateTeam = asyncHandler(async (req, res) => {
  validateTeam(req.body);
  const team = await Team.findByIdAndUpdate(req.params.id, pickTeamFields(req.body), {
    new: true, // return the updated document
    runValidators: true,
  });
  if (!team) throw notFound("Team not found");
  res.json({ success: true, data: team });
});

exports.deleteTeam = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const team = await Team.findById(id);
  if (!team) throw notFound("Team not found");

  // Rule: do not leave matches pointing to a deleted team.
  const matchCount = await Match.countDocuments({ $or: [{ teamA: id }, { teamB: id }] });
  if (matchCount > 0) throw badRequest("This team has matches. Delete those matches first.");

  await Player.deleteMany({ teamId: id }); // players belong to the team
  await team.deleteOne();
  res.json({ success: true, data: { message: "Team deleted" } });
});
