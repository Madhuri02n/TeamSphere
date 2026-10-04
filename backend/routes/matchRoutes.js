const express = require("express");
const c = require("../controllers/matchController");
const router = express.Router();

router.get("/", c.getMatches); // /api/matches?upcoming=true for upcoming only
router.get("/conflicts", c.getConflicts); // must stay ABOVE any "/:id" GET route
router.post("/", c.createMatch);
router.put("/:id", c.updateMatch);
router.delete("/:id", c.deleteMatch);

module.exports = router;
