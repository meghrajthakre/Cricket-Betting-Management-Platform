"use strict";

const asyncHandler = require("../../utils/asyncHandler");
const { ok } = require("../../utils/apiResponse");
const AppError = require("../../utils/AppError");

// ── GET /support/me ───────────────────────────────────────────────────────────
const getSupportProfile = asyncHandler(async (req, res) => {
  const { _id, username, firstName, role, isActive } = req.user;
  return ok(res, 200, "Support profile retrieved", {
    user: { _id, username, firstName, role, isActive },
  });
});

module.exports = { getSupportProfile };
