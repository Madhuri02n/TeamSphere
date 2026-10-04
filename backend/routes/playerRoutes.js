const express = require("express");
const c = require("../controllers/playerController");
const router = express.Router();

router.get("/", c.getPlayers); // optional filter: /api/players?teamId=...
router.post("/", c.createPlayer);
router.put("/:id", c.updatePlayer);
router.delete("/:id", c.deletePlayer);

module.exports = router;
