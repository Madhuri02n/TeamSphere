const mongoose = require("mongoose");

const flightSchema = new mongoose.Schema({
  flightNumber: { type: String, required: [true, "Flight number is required"], trim: true },
  from: { type: String, required: [true, "From city is required"], trim: true },
  to: { type: String, required: [true, "To city is required"], trim: true },
  price: { type: Number, required: true, min: [0, "Price cannot be negative"] },
  durationMinutes: { type: Number, required: true, min: [1, "Duration must be greater than 0"] },
  availableSeats: { type: Number, required: true, min: [0, "Seats cannot be negative"] },
  matchId: { type: mongoose.Schema.Types.ObjectId, ref: "Match", required: [true, "matchId is required"] },
});

module.exports = mongoose.model("Flight", flightSchema);
