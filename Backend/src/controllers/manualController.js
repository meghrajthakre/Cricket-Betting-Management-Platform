"use strict";

const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const manualService = require("../services/manualService");
const engine = require("../ManualEngine/engine");
const sse = require("../ManualEngine/sseServer");

const SESSION_STATUSES = ["open", "suspend", "closed"];
const LOCK_STATUSES = ["lock", "unlock"];
const ODD_EVEN_VALUES = ["yes", "no"];
const SESSION_UPDATE_FIELDS = [
    "status",
    "lockStatus",
    "rateDiff",
    "group",
    "maxAmount",
    "oddEven",
    "isVisible",
];

function requireText(value, fieldName) {
    if (typeof value !== "string" || !value.trim()) {
        throw new AppError(`${fieldName} is required`, 400);
    }
    return value.trim();
}

function validateSessionUpdates(body, allowedFields = SESSION_UPDATE_FIELDS) {
    const source = body || {};
    const updates = {};

    for (const field of allowedFields) {
        if (source[field] !== undefined) updates[field] = source[field];
    }

    if (Object.keys(updates).length === 0) {
        throw new AppError("At least one allowed field is required", 400);
    }
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
    if (updates.rateDiff !== undefined) {
        if (typeof updates.rateDiff !== "number" || !Number.isFinite(updates.rateDiff)) {
            throw new AppError("rateDiff must be a valid number", 400);
        }
    }
    if (updates.maxAmount !== undefined) {
        if (
            typeof updates.maxAmount !== "number" ||
            !Number.isFinite(updates.maxAmount) ||
            updates.maxAmount < 0
        ) {
            throw new AppError("maxAmount must be a number greater than or equal to zero", 400);
        }
    }
    if (updates.group !== undefined && typeof updates.group !== "string") {
        throw new AppError("group must be a string", 400);
    }

    return updates;
}

function broadcastSession(matchId, session) {
    sse.broadcast(matchId, {
        type: "SESSION_UPDATED",
        payload: { matchId, session },
    });
}

// POST /api/manual/update
const updateRunner = asyncHandler(async (req, res) => {
    const { matchId, runnerId, runnerName, lagai, khai, status, touched } = req.body || {};

    if (!matchId || !runnerId) {
        throw new AppError("matchId and runnerId are required", 400);
    }

    const runnerObj = {
        matchId,
        runnerId,
        runnerName: runnerName ?? '',
        lagai: typeof lagai === 'number' ? lagai : Number(lagai) || 0,
        khai: typeof khai === 'number' ? khai : Number(khai) || 0,
        status: status ?? 'open',
        // Whether the user has explicitly picked a value for this runner from
        // the dropdown (vs. it still sitting at its untouched default). This
        // is what lets a rateDiff change skip runners nobody has touched yet.
        touched: touched === true,
    };

    // Persist to DB
    const saved = await manualService.saveRunner(matchId, runnerObj);

    // Update in-memory cache
    engine.updateRunnerInCache(matchId, {
        runnerId: saved.runnerId,
        runnerName: saved.runnerName,
        lagai: saved.lagai,
        khai: saved.khai,
        status: saved.status,
        touched: saved.touched,
        updatedAt: saved.updatedAt,
    });

    // Broadcast via SSE
    const event = {
        type: 'RUNNER_UPDATED',
        payload: {
            matchId: saved.matchId,
            runnerId: saved.runnerId,
            runnerName: saved.runnerName,
            lagai: saved.lagai,
            khai: saved.khai,
            status: saved.status,
            touched: saved.touched,
        },
    };
    sse.broadcast(saved.matchId, event);

    res.status(200).json({ success: true, data: event.payload });
});

// GET /api/manual/events?matchId=...
const events = asyncHandler(async (req, res) => {
    const matchId = req.query.matchId || 'all';

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders && res.flushHeaders();

    // Register client
    sse.addClient(res, matchId);

    // Remove client on close
    req.on('close', () => {
        sse.removeClient(res, matchId);
    });

    // Keep the connection open (don't end response)
});

// GET /api/manual/state/:matchId
const state = asyncHandler(async (req, res) => {
    const matchId = req.params.matchId;
    if (!matchId) throw new AppError('matchId required', 400);

    // Try cache first, if empty load from DB and seed cache
    const cached = engine.getState(matchId);
    if (cached && cached.length > 0) {
        return res.status(200).json({ success: true, data: cached });
    }

    const rows = await manualService.getState(matchId);
    engine.setInitialState(matchId, rows);
    res.status(200).json({ success: true, data: rows });
});

// GET /api/manual/settings/:matchId
const getSettings = asyncHandler(async (req, res) => {
    const matchId = req.params.matchId;
    if (!matchId) throw new AppError('matchId required', 400);

    const settings = await manualService.getSettings(matchId);
    res.status(200).json({ success: true, data: settings });
});

// POST /api/manual/settings/update
const updateSettings = asyncHandler(async (req, res) => {
    const { matchId, rateDiff, betLock, sessionLock, mode, marketStatus } = req.body;

    if (!matchId) {
        throw new AppError('matchId is required', 400);
    }

    const { settings, updatedRunners, rateDiffChanged } = await manualService.updateSettings({
        matchId,
        rateDiff,
        betLock,
        sessionLock,
        mode,
        marketStatus
    });

    // Broadcast settings update via SSE
    sse.broadcast(matchId, {
        type: 'SETTINGS_UPDATED',
        payload: settings
    });

    // If rateDiff changed, sync engine cache + broadcast each affected runner
    // (updatedRunners only contains runners that were actually touched -
    // see manualService.recalculateRunnersForRateDiff)
    if (rateDiffChanged && updatedRunners.length > 0) {
        for (const runner of updatedRunners) {
            engine.updateRunnerInCache(matchId, {
                runnerId: runner.runnerId,
                runnerName: runner.runnerName,
                lagai: runner.lagai,
                khai: runner.khai,
                status: runner.status,
                touched: runner.touched,
                updatedAt: runner.updatedAt,
            });

            sse.broadcast(matchId, {
                type: 'RUNNER_UPDATED',
                payload: {
                    matchId,
                    runnerId: runner.runnerId,
                    runnerName: runner.runnerName,
                    lagai: runner.lagai,
                    khai: runner.khai,
                    status: runner.status,
                    touched: runner.touched,
                },
            });
        }
    }

    res.status(200).json({ success: true, data: settings, updatedRunners });
});

// GET /api/manual/score/:matchId
const getScore = asyncHandler(async (req, res) => {
    const matchId = req.params.matchId;
    if (!matchId) throw new AppError('matchId required', 400);

    const score = await manualService.getScore(matchId);
    res.status(200).json({ success: true, data: score });
});

// POST /api/manual/score/update
const updateScore = asyncHandler(async (req, res) => {
    const {
        matchId,
        status,
        firstBattingTeam,
        secondBattingTeam,
        currentInnings,
        firstInningsScore,
        secondInningsScore,
        runs,
        wickets,
        overs,
        balls,
        firstInnScore1,
        firstInnScore2,
        trailRun,
        leadRun,
    } = req.body || {};

    if (!matchId) throw new AppError('matchId is required', 400);

    const hasAnyField =
        status !== undefined || firstBattingTeam !== undefined || secondBattingTeam !== undefined ||
        currentInnings !== undefined || firstInningsScore !== undefined || secondInningsScore !== undefined ||
        runs !== undefined || wickets !== undefined ||
        overs !== undefined || balls !== undefined || firstInnScore1 !== undefined ||
        firstInnScore2 !== undefined || trailRun !== undefined || leadRun !== undefined;

    if (!hasAnyField) {
        throw new AppError('At least one field is required', 400);
    }

    const saved = await manualService.updateScore(matchId, {
        status,
        firstBattingTeam,
        secondBattingTeam,
        currentInnings,
        firstInningsScore,
        secondInningsScore,
        runs,
        wickets,
        overs,
        balls,
        firstInnScore1,
        firstInnScore2,
        trailRun,
        leadRun,
    });

    sse.broadcast(matchId, {
        type: 'SCORE_UPDATED',
        payload: {
            matchId: saved.matchId,
            status: saved.status,
            firstBattingTeam: saved.firstBattingTeam,
            secondBattingTeam: saved.secondBattingTeam,
            currentInnings: saved.currentInnings,
            firstInningsScore: saved.firstInningsScore,
            secondInningsScore: saved.secondInningsScore,
            runs: saved.runs,
            wickets: saved.wickets,
            overs: saved.overs,
            balls: saved.balls,
            firstInnScore1: saved.firstInnScore1,
            firstInnScore2: saved.firstInnScore2,
            trailRun: saved.trailRun,
            leadRun: saved.leadRun,
        },
    });

    res.status(200).json({ success: true, data: saved });
});

const getSessions = asyncHandler(async (req, res) => {
    const matchId = requireText(req.params.matchId, "matchId");
    const { sessions, initialized } = await manualService.getSessions(matchId);

    res.status(initialized ? 201 : 200).json({
        success: true,
        message: "Sessions fetched successfully",
        data: { matchId, sessions },
    });
});

const updateSession = asyncHandler(async (req, res) => {
    const matchId = requireText(req.params.matchId, "matchId");
    const sessionId = requireText(req.params.sessionId, "sessionId");
    const updates = validateSessionUpdates(req.body);
    const session = await manualService.updateSession(matchId, sessionId, updates);

    if (!session) throw new AppError("Session not found", 404);
    broadcastSession(matchId, session);
    res.status(200).json({
        success: true,
        message: "Session updated successfully",
        data: { matchId, session },
    });
});

const updateSessionStatus = asyncHandler(async (req, res) => {
    const matchId = requireText(req.params.matchId, "matchId");
    const sessionId = requireText(req.params.sessionId, "sessionId");
    const updates = validateSessionUpdates(req.body, ["status"]);
    const session = await manualService.updateSession(matchId, sessionId, {
        ...updates,
        manuallySuspended: updates.status === "suspend",
    });

    if (!session) throw new AppError("Session not found", 404);
    broadcastSession(matchId, session);
    res.status(200).json({
        success: true,
        message: "Session status updated successfully",
        data: { matchId, session },
    });
});

const updateSessionVisibility = asyncHandler(async (req, res) => {
    const matchId = requireText(req.params.matchId, "matchId");
    const sessionId = requireText(req.params.sessionId, "sessionId");
    const updates = validateSessionUpdates(req.body, ["isVisible"]);
    const session = await manualService.updateSession(matchId, sessionId, updates);

    if (!session) throw new AppError("Session not found", 404);
    broadcastSession(matchId, session);
    res.status(200).json({
        success: true,
        message: "Session visibility updated successfully",
        data: { matchId, session },
    });
});

const updateAllSessionStatuses = asyncHandler(async (req, res) => {
    const matchId = requireText(req.params.matchId, "matchId");
    const { status } = validateSessionUpdates(req.body, ["status"]);
    await manualService.getSessions(matchId);
    const sessions = await manualService.updateAllSessionStatuses(matchId, status);

    sse.broadcast(matchId, {
        type: "SESSIONS_UPDATED",
        payload: { matchId, sessions },
    });
    res.status(200).json({
        success: true,
        message: "Session statuses updated successfully",
        data: { matchId, sessions },
    });
});

const resetSessions = asyncHandler(async (req, res) => {
    const matchId = requireText(req.params.matchId, "matchId");
    const sessions = await manualService.resetSessions(matchId);

    sse.broadcast(matchId, {
        type: "SESSIONS_UPDATED",
        payload: { matchId, sessions },
    });
    res.status(200).json({
        success: true,
        message: "Sessions reset successfully",
        data: { matchId, sessions },
    });
});

module.exports = {
    updateRunner,
    events,
    state,
    getSettings,
    updateSettings,
    getScore,
    updateScore,
    getSessions,
    updateSession,
    updateSessionStatus,
    updateSessionVisibility,
    updateAllSessionStatuses,
    resetSessions,
};
