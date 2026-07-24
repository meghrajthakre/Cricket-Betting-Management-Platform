"use strict";

const express = require("express");
const { getBalance, getHistory, credit, debit } = require("./wallet.controller");
const {
    protect,
    allowRoles,
    allowSelfOrRoles,
} = require("../../middleware/authMiddleware");

const router = express.Router();

// Every wallet endpoint requires a valid authenticated account.
router.use(protect);

// GET /wallet/:userId/balance
router.get("/:userId/balance", allowSelfOrRoles("userId", "superadmin"), getBalance);

// GET /wallet/:userId/history
router.get("/:userId/history", allowSelfOrRoles("userId", "superadmin"), getHistory);

// POST /wallet/credit
router.post("/credit", allowRoles("superadmin"), credit);

// POST /wallet/debit
router.post("/debit", allowRoles("superadmin"), debit);

module.exports = router;
