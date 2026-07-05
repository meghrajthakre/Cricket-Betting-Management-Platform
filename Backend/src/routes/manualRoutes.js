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

// SSE
router.get("/events", events);

// Update Runner Odds
router.post("/update", updateRunner);

module.exports = router;