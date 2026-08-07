"use strict";

const asyncHandler = require("../../utils/asyncHandler");
const AppError = require("../../utils/AppError");
const sessionService = require("./session.service");
const sse = require("../manual/manual.events");

const SESSION_STATUSES = ["open", "suspend", "closed"];
const LOCK_STATUSES = ["lock", "unlock"];
const ODD_EVEN_VALUES = ["yes", "no"];
const SESSION_UPDATE_FIELDS = [
  "status", "lockStatus", "rateDiff", "group", "maxAmount", "oddEven", "isVisible",
];

const requireText = (value, name) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new AppError(`${name} is required`, 400);
  }
  return value.trim();
};

function validateUpdates(body, allowedFields = SESSION_UPDATE_FIELDS) {
  const updates = {};
  for (const field of allowedFields) {
    if (body?.[field] !== undefined) updates[field] = body[field];
  }
  if (!Object.keys(updates).length) throw new AppError("At least one allowed field is required", 400);
  if (updates.status !== undefined && !SESSION_STATUSES.includes(updates.status)) {
    throw new AppError("status must be open, suspend or closed", 400);
  }
  if (updates.lockStatus !== undefined && !LOCK_STATUSES.includes(updates.lockStatus)) {
    throw new AppError("lockStatus must be lock or unlock", 400);
  }
  if (updates.oddEven !== undefined && !ODD_EVEN_VALUES.includes(updates.oddEven)) {
    throw new AppError("oddEven must be yes or no", 400);
  }
  if (updates.isVisible !== undefined && typeof updates.isVisible !== "boolean") {
    throw new AppError("isVisible must be a boolean", 400);
  }
  if (updates.rateDiff !== undefined && !Number.isFinite(updates.rateDiff)) {
    throw new AppError("rateDiff must be a valid number", 400);
  }
  if (updates.maxAmount !== undefined && (!Number.isFinite(updates.maxAmount) || updates.maxAmount < 0)) {
    throw new AppError("maxAmount must be a non-negative number", 400);
  }
  if (updates.group !== undefined && typeof updates.group !== "string") {
    throw new AppError("group must be a string", 400);
  }
  return updates;
}

const broadcastSession = (matchId, session) =>
  sse.broadcast(matchId, { type: "SESSION_UPDATED", payload: { matchId, session } });

const getSessions = asyncHandler(async (req, res) => {
  const matchId = requireText(req.params.matchId, "matchId");
  const { sessions, initialized } = await sessionService.getSessions(matchId);
  res.status(initialized ? 201 : 200).json({
    success: true,
    message: "Sessions fetched successfully",
    data: { matchId, sessions },
  });
});

const getPendingBetSessions = asyncHandler(async (req, res) => {
  const matchId = requireText(req.params.matchId, "matchId");
  const sessions = await sessionService.getPendingBetSessions(matchId);
  res.status(200).json({
    success: true,
    data: { matchId, sessions },
  });
});

const updateSession = asyncHandler(async (req, res) => {
  const matchId = requireText(req.params.matchId, "matchId");
  const sessionId = requireText(req.params.sessionId, "sessionId");
  const session = await sessionService.updateSession(matchId, sessionId, validateUpdates(req.body));
  if (!session) throw new AppError("Session not found", 404);
  broadcastSession(matchId, session);
  res.status(200).json({ success: true, data: { matchId, session } });
});

const updateSessionStatus = asyncHandler(async (req, res) => {
  const matchId = requireText(req.params.matchId, "matchId");
  const sessionId = requireText(req.params.sessionId, "sessionId");
  const updates = validateUpdates(req.body, ["status"]);
  const session = await sessionService.updateSession(matchId, sessionId, {
    ...updates,
    manuallySuspended: updates.status === "suspend",
  });
  if (!session) throw new AppError("Session not found", 404);
  broadcastSession(matchId, session);
  res.status(200).json({ success: true, data: { matchId, session } });
});

const updateSessionVisibility = asyncHandler(async (req, res) => {
  const matchId = requireText(req.params.matchId, "matchId");
  const sessionId = requireText(req.params.sessionId, "sessionId");
  const session = await sessionService.updateSession(
    matchId,
    sessionId,
    validateUpdates(req.body, ["isVisible"])
  );
  if (!session) throw new AppError("Session not found", 404);
  broadcastSession(matchId, session);
  res.status(200).json({ success: true, data: { matchId, session } });
});

const updateAllSessionStatuses = asyncHandler(async (req, res) => {
  const matchId = requireText(req.params.matchId, "matchId");
  const { status } = validateUpdates(req.body, ["status"]);
  await sessionService.getSessions(matchId);
  const sessions = await sessionService.updateAllSessionStatuses(matchId, status);
  sse.broadcast(matchId, { type: "SESSIONS_UPDATED", payload: { matchId, sessions } });
  res.status(200).json({ success: true, data: { matchId, sessions } });
});

const resetSessions = asyncHandler(async (req, res) => {
  const matchId = requireText(req.params.matchId, "matchId");
  const sessions = await sessionService.resetSessions(matchId);
  sse.broadcast(matchId, { type: "SESSIONS_UPDATED", payload: { matchId, sessions } });
  res.status(200).json({ success: true, data: { matchId, sessions } });
});

const settleSession = asyncHandler(async (req, res) => {
  const matchId = requireText(req.params.matchId, "matchId");
  const sessionId = requireText(req.params.sessionId, "sessionId");
  const result = await sessionService.settleSession(
    matchId,
    sessionId,
    req.body?.resultRun,
    req.user._id
  );
  sse.broadcast(matchId, {
    type: "SESSION_SETTLED",
    payload: { matchId, ...result },
  });
  broadcastSession(matchId, result.session);
  res.status(200).json({
    success: true,
    message: "Session settled successfully",
    data: { matchId, ...result },
  });
});

const reverseSessionSettlement = asyncHandler(async (req, res) => {
  const matchId = requireText(req.params.matchId, "matchId");
  const sessionId = requireText(req.params.sessionId, "sessionId");
  const result = await sessionService.reverseSessionSettlement(matchId, sessionId, req.user._id);
  sse.broadcast(matchId, {
    type: "SESSION_SETTLEMENT_REVERSED",
    payload: { matchId, ...result },
  });
  broadcastSession(matchId, result.session);
  res.status(200).json({
    success: true,
    message: "Session settlement reversed successfully",
    data: { matchId, ...result },
  });
});

module.exports = {
  getSessions,
  getPendingBetSessions,
  updateSession,
  updateSessionStatus,
  updateSessionVisibility,
  updateAllSessionStatuses,
  resetSessions,
  settleSession,
  reverseSessionSettlement,
};
