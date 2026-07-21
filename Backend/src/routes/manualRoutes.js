"use strict";

const { Router } = require("express");
const {
    updateRunner,
    updateSettings,
    events,
    state,
    getSettings,
    getScore,
    updateScore,
    getSessions,
    updateSession,
    updateSessionStatus,
    updateSessionVisibility,
    updateAllSessionStatuses,
    resetSessions,
} = require("../controllers/manualController");

const router = Router();
const { protect, allowRoles } = require("../middleware/authMiddleware");
const { getOptions, updateOptions, settleToss, settleTie } = require("../controllers/manualOptionsController");

// Initial State
router.get("/state/:matchId", state);

// Settings
router.get("/settings/:matchId", getSettings);
router.post("/settings/update", protect, allowRoles("support", "superadmin"), updateSettings);

// Score
router.get("/score/:matchId", getScore);
router.post("/score/update", protect, allowRoles("support", "superadmin"), updateScore);

// Sessions
router.get("/sessions/:matchId", getSessions);
router.patch("/sessions/:matchId/status", protect, allowRoles("support", "superadmin"), updateAllSessionStatuses);
router.post("/sessions/:matchId/reset", protect, allowRoles("support", "superadmin"), resetSessions);
router.patch("/sessions/:matchId/:sessionId/status", protect, allowRoles("support", "superadmin"), updateSessionStatus);
router.patch("/sessions/:matchId/:sessionId/visibility", protect, allowRoles("support", "superadmin"), updateSessionVisibility);
router.patch("/sessions/:matchId/:sessionId", protect, allowRoles("support", "superadmin"), updateSession);

// SSE
router.get("/events", events);

// Match options are readable by match clients; only support staff can mutate.
router.get("/options/:matchId", getOptions);
router.put("/options/:matchId", protect, allowRoles("support", "superadmin"), updateOptions);
router.post("/options/:matchId/settle-toss", protect, allowRoles("support", "superadmin"), settleToss);
router.post("/options/:matchId/settle-tie", protect, allowRoles("support", "superadmin"), settleTie);

// Update Runner Odds
router.post("/update", protect, allowRoles("support", "superadmin"), updateRunner);

module.exports = router;
