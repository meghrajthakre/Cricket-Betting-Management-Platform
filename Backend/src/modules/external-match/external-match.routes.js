"use strict";

const express = require("express");
const { protect, allowRoles } = require("../../middleware/authMiddleware");
const { getExternalMatches, saveExternalMatch } = require("./external-match.controller");

const router = express.Router();

router.get("/", getExternalMatches);
router.post("/save", protect, allowRoles("support", "superadmin"), saveExternalMatch);

module.exports = router;
