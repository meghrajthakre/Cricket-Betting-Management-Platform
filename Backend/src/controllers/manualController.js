"use strict";

const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const manualService = require("../services/manualService");
const engine = require("../ManualEngine/engine");
const sse = require("../ManualEngine/sseServer");

// POST /api/manual/update
const updateRunner = asyncHandler(async (req, res) => {
    const { matchId, runnerId, runnerName, lagai, khai, status } = req.body || {};

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
    if (rateDiffChanged && updatedRunners.length > 0) {
        for (const runner of updatedRunners) {
            engine.updateRunnerInCache(matchId, {
                runnerId: runner.runnerId,
                runnerName: runner.runnerName,
                lagai: runner.lagai,
                khai: runner.khai,
                status: runner.status,
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
        currentInnings !== undefined || runs !== undefined || wickets !== undefined ||
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
module.exports = { updateRunner, events, state, getSettings, updateSettings, getScore, updateScore };