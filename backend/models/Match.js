const mongoose = require("mongoose");

// date is stored as "YYYY-MM-DD" and times as "HH:MM" (24-hour) strings.
// Strings keep the code simple and avoid time-zone confusion.
const matchSchema = new mongoose.Schema({
  teamA: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
  teamB: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
  date: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  venue: { type: String, trim: true, default: "" },
  city: { type: String, trim: true, default: "" },
  status: { type: String, enum: ["Scheduled", "Cancelled", "Completed"], default: "Scheduled" },
});

module.exports = mongoose.model("Match", matchSchema);
