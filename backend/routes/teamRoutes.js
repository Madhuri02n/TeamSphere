const express = require("express");
const c = require("../controllers/teamController");
const router = express.Router();

router.get("/", c.getTeams);
router.get("/:id", c.getTeam);
router.post("/", c.createTeam);
router.put("/:id", c.updateTeam);
router.delete("/:id", c.deleteTeam);

module.exports = router;
