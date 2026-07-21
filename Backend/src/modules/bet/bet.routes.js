"use strict";

const express = require("express");
const { placeBetController, settleBetController } = require("./bet.controller");
const { protect, allowRoles } = require("../../middleware/authMiddleware");

const router = express.Router();

// POST /bet/place
router.post("/place", protect, allowRoles("user"), placeBetController);

// POST /bet/settle
router.post("/settle", protect, allowRoles("support", "superadmin"), settleBetController);

module.exports = router;
