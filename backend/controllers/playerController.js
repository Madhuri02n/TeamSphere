const Player = require("../models/Player");
const Team = require("../models/Team");
const { asyncHandler, badRequest, notFound, isBlank, isNumber } = require("../middleware/errorHandler");

async function validatePlayer(body) {
  if (isBlank(body.name)) throw badRequest("Player name is required");
  if (!isNumber(body.age) || Number(body.age) <= 0) throw badRequest("Age must be greater than 0");
  if (isBlank(body.position)) throw badRequest("Position is required");
  if (isBlank(body.teamId)) throw badRequest("teamId is required");
  const team = await Team.findById(body.teamId);
  if (!team) throw notFound("Team not found");
}

function pickPlayerFields(body) {
  return { name: body.name, age: Number(body.age), position: body.position, teamId: body.teamId };
}

exports.getPlayers = asyncHandler(async (req, res) => {
  const filter = req.query.teamId ? { teamId: req.query.teamId } : {};
  const players = await Player.find(filter).sort({ name: 1 });
  res.json({ success: true, data: players });
});

exports.createPlayer = asyncHandler(async (req, res) => {
  await validatePlayer(req.body);
  const player = await Player.create(pickPlayerFields(req.body));
  res.status(201).json({ success: true, data: player });
});

exports.updatePlayer = asyncHandler(async (req, res) => {
  await validatePlayer(req.body);
  const player = await Player.findByIdAndUpdate(req.params.id, pickPlayerFields(req.body), {
    new: true,
    runValidators: true,
  });
  if (!player) throw notFound("Player not found");
  res.json({ success: true, data: player });
});

exports.deletePlayer = asyncHandler(async (req, res) => {
  const player = await Player.findByIdAndDelete(req.params.id);
  if (!player) throw notFound("Player not found");
  res.json({ success: true, data: { message: "Player deleted" } });
});
