"use strict";

const express = require("express");
const { creditCoins, debitCoins, settlementLedger } = require("./ledger.controller");
const { protect, allowRoles } = require("../../middleware/authMiddleware");

const router = express.Router();

// Ledger mutations are privileged financial operations.
router.use(protect);
router.get("/settlement", allowRoles("superadmin", "sub_company"), settlementLedger);
router.use(allowRoles("superadmin"));

// POST /ledger/credit
router.post("/credit", creditCoins);

// POST /ledger/debit
router.post("/debit", debitCoins);

module.exports = router;
