const express = require("express");
const c = require("../controllers/flightController");
const router = express.Router();

router.get("/", c.getFlights); // /api/flights?matchId=...
router.get("/cheapest", c.getCheapest); // /api/flights/cheapest?matchId=...
router.get("/fastest", c.getFastest); // /api/flights/fastest?matchId=...
router.post("/", c.createFlight);
router.delete("/:id", c.deleteFlight);

module.exports = router;
