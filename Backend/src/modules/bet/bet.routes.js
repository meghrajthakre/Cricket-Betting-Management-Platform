"use strict";

const express = require("express");
const { placeBetController, settleBetController, getMyBetsController } = require("./bet.controller");
const { protect, allowRoles } = require("../../middleware/authMiddleware");
const { betLimiter } = require("../../middleware/rateLimiters");

const router = express.Router();

// POST /bet/place
router.post("/place", protect, allowRoles("user"), betLimiter, placeBetController);

// GET /bet/mine?matchId=...
router.get("/mine", protect, allowRoles("user"), getMyBetsController);

// POST /bet/settle
router.post("/settle", protect, allowRoles("support", "superadmin"), settleBetController);

module.exports = router;
