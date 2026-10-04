const Flight = require("../models/Flight");
const Match = require("../models/Match");
const { asyncHandler, badRequest, notFound, isBlank, isNumber } = require("../middleware/errorHandler");
const { pickFlight } = require("../utils/cppEngine");

async function validateFlight(body) {
  if (isBlank(body.flightNumber)) throw badRequest("Flight number is required");
  if (isBlank(body.from)) throw badRequest("From city is required");
  if (isBlank(body.to)) throw badRequest("To city is required");
  if (!isNumber(body.price) || Number(body.price) < 0) throw badRequest("Price must be 0 or more");
  if (!isNumber(body.durationMinutes) || Number(body.durationMinutes) <= 0) throw badRequest("Duration must be greater than 0");
  if (!isNumber(body.availableSeats) || Number(body.availableSeats) < 0) throw badRequest("Seats must be 0 or more");
  if (isBlank(body.matchId)) throw badRequest("matchId is required");
  const match = await Match.findById(body.matchId);
  if (!match) throw notFound("Match not found");
}

exports.getFlights = asyncHandler(async (req, res) => {
  const filter = req.query.matchId ? { matchId: req.query.matchId } : {};
  const flights = await Flight.find(filter).sort({ price: 1 });
  res.json({ success: true, data: flights });
});

exports.createFlight = asyncHandler(async (req, res) => {
  await validateFlight(req.body);
  const b = req.body;
  const flight = await Flight.create({
    flightNumber: b.flightNumber,
    from: b.from,
    to: b.to,
    price: Number(b.price),
    durationMinutes: Number(b.durationMinutes),
    availableSeats: Number(b.availableSeats),
    matchId: b.matchId,
  });
  res.status(201).json({ success: true, data: flight });
});

exports.deleteFlight = asyncHandler(async (req, res) => {
  const flight = await Flight.findByIdAndDelete(req.params.id);
  if (!flight) throw notFound("Flight not found");
  res.json({ success: true, data: { message: "Flight deleted" } });
});

// The C++ engine does the work (linear scan, Time: O(n), Space: O(1)).
async function findBestFlight(type, req, res) {
  if (isBlank(req.query.matchId)) throw badRequest("matchId is required");
  const flights = await Flight.find({ matchId: req.query.matchId });
  if (flights.length === 0) throw notFound("No flights found for this match");

  const winnerId = await pickFlight(type, flights); // "cheapest" or "fastest"
  const winner = flights.find((f) => String(f._id) === winnerId);
  res.json({ success: true, data: winner });
}

exports.getCheapest = asyncHandler((req, res) => findBestFlight("cheapest", req, res));
exports.getFastest = asyncHandler((req, res) => findBestFlight("fastest", req, res));
