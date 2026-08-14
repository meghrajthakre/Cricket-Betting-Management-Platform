"use strict";

const { Router } = require("express");
const { getProfile, getCoins, getLedger, getLedgerMatchBets, changeOwnPassword } = require("./user.controller");
const { protect } = require("../../middleware/authMiddleware");
const { userOnly } = require("../../middleware/roleMiddleware");
const { validateQuery, paginationSchema } = require("../../utils/validators");

const router = Router();

// Every route requires: valid JWT + user role
router.use(protect, userOnly);

/**
 * GET /user/profile
 * Returns full profile including createdBy reference
 */
router.get("/profile", getProfile);

/**
 * GET /user/coins
 * Returns live coin balance
 */
router.get("/coins", getCoins);

/**
 * GET /user/ledger?page=1&limit=10
 * Returns paginated personal transaction history
 */
router.get("/ledger", validateQuery(paginationSchema), getLedger);
router.get("/ledger/matches/:matchId", getLedgerMatchBets);
router.patch("/password", changeOwnPassword);

module.exports = router;
