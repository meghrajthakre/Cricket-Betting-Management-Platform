"use strict";
const express = require("express");
const router = express.Router();

const { getBanner, upsertBanner } = require("./banner.controller");
const { protect } = require("../../middleware/authMiddleware");

// Public read — no auth needed
router.get("/", getBanner);

// Protected write — only logged-in users
router.put("/", protect, upsertBanner);

module.exports = router;
