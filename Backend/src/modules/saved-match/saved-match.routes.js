const express = require("express");

const { getMatches, getLiveMatches } = require("./in-play.controller");
const {
  saveMatchHandler,
  getSavedMatchesHandler,
  deleteSavedMatchHandler,
  getSavedMatchByIdHandler,
} = require("./saved-match.controller");
const { protect } = require("../../middleware/authMiddleware");
const { superAdminOnly } = require("../../middleware/roleMiddleware");

const router = express.Router();

// ─── Public ──────────────────────────────────────────────────────────────────
router.get("/live", getLiveMatches);
router.get("/",      getMatches);
router.get("/saved", getSavedMatchesHandler);  // ← public
router.get("/saved/:matchId", getSavedMatchByIdHandler); // ← public
// ─── Superadmin only ─────────────────────────────────────────────────────────
router.post("/save",       protect, superAdminOnly, saveMatchHandler);
router.delete("/:matchId", protect, superAdminOnly, deleteSavedMatchHandler);

module.exports = router;
