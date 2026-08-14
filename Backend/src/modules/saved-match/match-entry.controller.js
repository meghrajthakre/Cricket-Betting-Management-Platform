"use strict";

const asyncHandler = require("../../utils/asyncHandler");
const { ok } = require("../../utils/apiResponse");
const { enterMatch } = require("./match-entry.service");

const enterMatchHandler = asyncHandler(async (req, res) => {
  const data = await enterMatch(req.user._id, req.params.matchId);
  return ok(res, data.alreadyEntered ? 200 : 201, data.alreadyEntered ? "Match already entered" : "Match entry fee charged", data);
});

module.exports = { enterMatchHandler };
