"use strict";

const express = require("express");
const {
    placeBetController,
    settleBetController,
    getMyBetsController,
    getAllMatchBetsController,
    getCompanyMatchBetsController,
    deleteBetController,
} = require("./bet.controller");
const { protect, allowRoles } = require("../../middleware/authMiddleware");
const { betLimiter } = require("../../middleware/rateLimiters");

const router = express.Router();

// POST /bet/place
router.post("/place", protect, allowRoles("user"), betLimiter, placeBetController);

// GET /bet/mine?matchId=...
router.get("/mine", protect, allowRoles("user"), getMyBetsController);

// GET /bet/match?matchId=...
router.get("/match", protect, allowRoles("superadmin"), getAllMatchBetsController);
router.get("/company-match", protect, allowRoles("sub_company"), getCompanyMatchBetsController);

// DELETE /bet/:betId — pending exposure is safely reversed.
router.delete("/:betId", protect, allowRoles("superadmin"), deleteBetController);

// POST /bet/settle
router.post("/settle", protect, allowRoles("support", "superadmin"), settleBetController);

module.exports = router;
