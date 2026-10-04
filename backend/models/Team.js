const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema({
  teamName: { type: String, required: [true, "Team name is required"], trim: true },
  city: { type: String, required: [true, "City is required"], trim: true },
  sport: { type: String, trim: true, default: "" },
  coach: { type: String, trim: true, default: "" },
});

module.exports = mongoose.model("Team", teamSchema);
