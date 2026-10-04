const mongoose = require("mongoose");

const playerSchema = new mongoose.Schema({
  name: { type: String, required: [true, "Player name is required"], trim: true },
  age: { type: Number, required: [true, "Age is required"], min: [1, "Age must be greater than 0"] },
  position: { type: String, required: [true, "Position is required"], trim: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: [true, "teamId is required"] },
});

module.exports = mongoose.model("Player", playerSchema);
