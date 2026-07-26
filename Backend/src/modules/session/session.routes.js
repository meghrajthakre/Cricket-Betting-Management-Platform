"use strict";

const { Router } = require("express");
const { protect, allowRoles } = require("../../middleware/authMiddleware");
const {
  getSessions,
  getPendingBetSessions,
  updateSession,
  updateSessionStatus,
  updateSessionVisibility,
  updateAllSessionStatuses,
  resetSessions,
  settleSession,
} = require("./session.controller");

const router = Router();
const staffOnly = [protect, allowRoles("support", "superadmin")];

router.get("/:matchId", getSessions);
router.get("/:matchId/pending", ...staffOnly, getPendingBetSessions);
router.patch("/:matchId/status", ...staffOnly, updateAllSessionStatuses);
router.post("/:matchId/reset", ...staffOnly, resetSessions);
router.post("/:matchId/:sessionId/settle", ...staffOnly, settleSession);
router.patch("/:matchId/:sessionId/status", ...staffOnly, updateSessionStatus);
router.patch("/:matchId/:sessionId/visibility", ...staffOnly, updateSessionVisibility);
router.patch("/:matchId/:sessionId", ...staffOnly, updateSession);

module.exports = router;
