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

// Initial State
router.get("/state/:matchId", state);

// Settings
router.get("/settings/:matchId", getSettings);
router.post("/settings/update", updateSettings);

// Score
router.get("/score/:matchId", getScore);
router.post("/score/update", updateScore);

// Sessions
router.get("/sessions/:matchId", getSessions);
router.patch("/sessions/:matchId/status", updateAllSessionStatuses);
router.post("/sessions/:matchId/reset", resetSessions);
router.patch("/sessions/:matchId/:sessionId/status", updateSessionStatus);
router.patch("/sessions/:matchId/:sessionId/visibility", updateSessionVisibility);
router.patch("/sessions/:matchId/:sessionId", updateSession);

// SSE
router.get("/events", events);

// Update Runner Odds
router.post("/update", updateRunner);

module.exports = router;
