"use strict";

const ManualRunner = require("../models/ManualModel/ManualRunner");
const ManualSettings = require('../models/ManualModel/ManualSettings');
const ManualScore = require('../models/ManualModel/ManualScore');

async function saveRunner(matchId, runner) {
    // Upsert runner document by matchId + runnerId
    const filter = { matchId: matchId, runnerId: runner.runnerId };
    const update = {
        $set: {
            runnerName: runner.runnerName,
            lagai: runner.lagai ?? 0,
            khai: runner.khai ?? 0,
            status: runner.status ?? 'open',
        },
    };
    const opts = {
        upsert: true,
        returnDocument: "after",
        setDefaultsOnInsert: true,
    };

    const doc = await ManualRunner.findOneAndUpdate(filter, update, opts).lean();
    return doc;
}

async function getState(matchId) {
    const rows = await ManualRunner.find({ matchId }).lean();
    return rows || [];
}

async function getSettings(matchId) {
    let settings = await ManualSettings.findOne({ matchId });
    if (!settings) {
        // Create default settings if not exists
        settings = await ManualSettings.create({
            matchId,
            rateDiff: 1,
            betLock: false,
            sessionLock: false,
            mode: 'Lagai',
            marketStatus: 'OPEN'
        });
    }
    return settings;
}

// Default convention: khai (lay) = lagai (back) + rateDiff
// Change this formula here if your business logic differs
// (e.g. percentage-based: lagai * (1 + rateDiff / 100)).
function computeOddsFromRateDiff(lagai, rateDiff) {
    const safeLagai = Number(lagai) || 0;
    const safeDiff = Number(rateDiff) || 0;
    return Math.round((safeLagai + safeDiff) * 100) / 100;
}

// Recompute khai for every runner in a match based on a new rateDiff
async function recalculateRunnersForRateDiff(matchId, rateDiff) {
    const runners = await ManualRunner.find({ matchId }).lean();
    const updated = [];

    for (const runner of runners) {
        const newKhai = computeOddsFromRateDiff(runner.lagai, rateDiff);
        const doc = await ManualRunner.findOneAndUpdate(
            { matchId, runnerId: runner.runnerId },
            { $set: { khai: newKhai } },
            { returnDocument: "after" }
        ).lean();
        updated.push(doc);
    }

    return updated;
}

async function updateSettings(data) {
    const { matchId, rateDiff, betLock, sessionLock, mode, marketStatus } = data;

    let settings = await ManualSettings.findOne({ matchId });

    if (!settings) {
        settings = new ManualSettings({ matchId });
    }

    const rateDiffChanged = rateDiff !== undefined && rateDiff !== settings.rateDiff;

    if (rateDiff !== undefined) settings.rateDiff = rateDiff;
    if (betLock !== undefined) settings.betLock = betLock;
    if (sessionLock !== undefined) settings.sessionLock = sessionLock;
    if (mode !== undefined) settings.mode = mode;
    if (marketStatus !== undefined) settings.marketStatus = marketStatus;

    await settings.save();

    let updatedRunners = [];
    if (rateDiffChanged) {
        updatedRunners = await recalculateRunnersForRateDiff(matchId, settings.rateDiff);
    }

    return { settings, updatedRunners, rateDiffChanged };
}

// Get current score/status for a match
async function getScore(matchId) {
    let score = await ManualScore.findOne({ matchId }).lean();
    if (!score) {
        score = { matchId, status: "" };
    }
    return score;
}

// Upsert the score/status for a match.
// `updates` can include any subset of: status, firstBattingTeam, secondBattingTeam,
// currentInnings, runs, wickets, overs, balls, firstInnScore1, firstInnScore2, trailRun, leadRun
async function updateScore(matchId, updates) {
    const setFields = {};

    if (updates.status !== undefined) setFields.status = updates.status;
    if (updates.firstBattingTeam !== undefined) setFields.firstBattingTeam = updates.firstBattingTeam;
    if (updates.secondBattingTeam !== undefined) setFields.secondBattingTeam = updates.secondBattingTeam;
    if (updates.currentInnings !== undefined) setFields.currentInnings = Number(updates.currentInnings) || 1;
    if (updates.runs !== undefined) setFields.runs = Number(updates.runs) || 0;
    if (updates.wickets !== undefined) setFields.wickets = Number(updates.wickets) || 0;
    if (updates.overs !== undefined) setFields.overs = Number(updates.overs) || 0;
    if (updates.balls !== undefined) setFields.balls = Array.isArray(updates.balls) ? updates.balls : [];
    if (updates.firstInnScore1 !== undefined) setFields.firstInnScore1 = updates.firstInnScore1;
    if (updates.firstInnScore2 !== undefined) setFields.firstInnScore2 = updates.firstInnScore2;
    if (updates.trailRun !== undefined) setFields.trailRun = updates.trailRun;
    if (updates.leadRun !== undefined) setFields.leadRun = updates.leadRun;

    const doc = await ManualScore.findOneAndUpdate(
        { matchId },
        { $set: setFields },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
    return doc;
}

module.exports = {
    saveRunner,
    getState,
    getSettings,
    updateSettings,
    computeOddsFromRateDiff,
    recalculateRunnersForRateDiff,
    getScore,
    updateScore,
};