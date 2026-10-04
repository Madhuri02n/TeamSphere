// Entry point: creates the Express app, connects to MongoDB, starts the server.
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const teamRoutes = require("./routes/teamRoutes");
const playerRoutes = require("./routes/playerRoutes");
const matchRoutes = require("./routes/matchRoutes");
const flightRoutes = require("./routes/flightRoutes");
const { errorHandler } = require("./middleware/errorHandler");
const { engineExists, ENGINE_PATH } = require("./utils/cppEngine");

// The scheduling logic lives in C++, so the compiled program must exist.
if (!engineExists()) {
  console.error(`C++ engine not found at: ${ENGINE_PATH}`);
  console.error("Build it first:  cd backend && npm run build:cpp   (needs g++)");
  process.exit(1);
}

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || true })); // allow the React app to call this API
app.use(express.json()); // lets us read JSON from req.body

app.get("/", (req, res) => res.json({ success: true, message: "TeamSphere API is running" }));

app.use("/api/teams", teamRoutes);
app.use("/api/players", playerRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/flights", flightRoutes);

// Unknown URL -> 404
app.use((req, res) => res.status(404).json({ success: false, message: "Route not found" }));

// Every error ends up here (must be the LAST app.use)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("Could not connect to MongoDB:", err.message);
    process.exit(1);
  });
