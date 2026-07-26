"use strict";

const express = require("express");
const router = express.Router();

const { protect } = require("../../middleware/authMiddleware");
const { superAdminOnly } = require("../../middleware/roleMiddleware");
const {
  getSuperadminProfile,
  updateSuperadminProfile,
} = require("./admin-profile.controller");

// ── Profile ───────────────────────────────────────────────────────────────────
router.get("/profile",   protect, superAdminOnly, getSuperadminProfile);
router.patch("/profile", protect, superAdminOnly, updateSuperadminProfile);

module.exports = router;
