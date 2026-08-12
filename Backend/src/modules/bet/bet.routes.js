"use strict";

const express = require("express");
const {
    placeBetController,
    settleBetController,
    settleMatchBetsController,
    reverseMatchSettlementController,
    getMyBetsController,
    getAllMatchBetsController,
    getCompanyMatchBetsController,
    getCompanyMatchSummariesController,
    getSettlementLedgerController,
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
router.get("/company-match-summaries", protect, allowRoles("sub_company"), getCompanyMatchSummariesController);
router.get("/settlement-ledger", protect, allowRoles("superadmin", "sub_company"), getSettlementLedgerController);

// DELETE /bet/:betId — pending exposure is safely reversed.
router.delete("/:betId", protect, allowRoles("superadmin"), deleteBetController);

// POST /bet/settle
router.post("/settle", protect, allowRoles("support", "superadmin"), settleBetController);
router.post("/settle-match", protect, allowRoles("support", "superadmin"), settleMatchBetsController);
router.post("/reverse-match-settlement", protect, allowRoles("superadmin"), reverseMatchSettlementController);

module.exports = router;
