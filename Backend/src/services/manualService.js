"use strict";

const ManualRunner = require("../models/ManualModel/ManualRunner");
const ManualSettings = require('../models/ManualModel/ManualSettings');
const ManualScore = require('../models/ManualModel/ManualScore');
const ManualSession = require("../models/ManualModel/ManualSession");
const dummySessions = require("../data/dummySessions");

let manualSessionIndexesReady;

async function ensureManualSessionIndexes() {
    if (!manualSessionIndexesReady) {
        // Remove obsolete indexes from older ManualSession schemas (such as
        // matchId + sessionId and matchId + name) and create the current ones.
        // Those legacy unique indexes treat missing fields as null and allow
        // only one new session document per match.
        manualSessionIndexesReady = ManualSession.syncIndexes().catch((error) => {
            manualSessionIndexesReady = null;
            throw error;
        });
    }
    return manualSessionIndexesReady;
}

async function saveRunner(matchId, runner) {
    // Upsert runner document by matchId + runnerId
    const filter = { matchId: matchId, runnerId: runner.runnerId };
    const update = {
        $set: {
            runnerName: runner.runnerName,
            lagai: runner.lagai ?? 0,
            khai: runner.khai ?? 0,
            status: runner.status ?? 'open',
            touched: runner.touched === true,
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

// Recompute khai for runners in a match based on a new rateDiff.
// IMPORTANT: only runners the user has explicitly touched (picked a value
// from the dropdown, including 0) get recalculated. Untouched runners must
// stay at khai 0 regardless of rateDiff - otherwise every match would show
// stale/phantom khai values on runners nobody has set odds for yet.
async function recalculateRunnersForRateDiff(matchId, rateDiff) {
    const runners = await ManualRunner.find({ matchId }).lean();
    const updated = [];

    for (const runner of runners) {
        if (!runner.touched) {
            // Leave untouched runners alone entirely - don't even rewrite khai.
            continue;
        }

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
// currentInnings, firstInningsScore, secondInningsScore, runs, wickets, overs, balls,
// firstInnScore1, firstInnScore2, trailRun, leadRun
async function updateScore(matchId, updates) {
    const setFields = {};

    if (updates.status !== undefined) setFields.status = updates.status;
    if (updates.firstBattingTeam !== undefined) setFields.firstBattingTeam = updates.firstBattingTeam;
    if (updates.secondBattingTeam !== undefined) setFields.secondBattingTeam = updates.secondBattingTeam;
    if (updates.currentInnings !== undefined) setFields.currentInnings = Number(updates.currentInnings) || 1;
    if (updates.firstInningsScore !== undefined) setFields.firstInningsScore = updates.firstInningsScore;
    if (updates.secondInningsScore !== undefined) setFields.secondInningsScore = updates.secondInningsScore;
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
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    ).lean();
    return doc;
}

function cloneSessionsForMatch(matchId) {
    return dummySessions.map((session) => ({ ...session, matchId }));
}

async function getSessions(matchId) {
    await ensureManualSessionIndexes();

    const templates = cloneSessionsForMatch(matchId);
    let initialized = false;

    try {
        const result = await ManualSession.bulkWrite(
            templates.map((session) => ({
                updateOne: {
                    filter: { matchId, id: session.id },
                    update: { $setOnInsert: session },
                    upsert: true,
                },
            })),
            { ordered: false }
        );
        initialized = (result.upsertedCount || 0) > 0;
    } catch (error) {
        // Two page requests can initialize the same match at the same time
        // (for example, React StrictMode in development). In that case one
        // request may insert a session just before the other request does.
        // The unique indexes correctly reject the duplicate, but fetching the
        // now-existing rows is still a successful initialization outcome.
        const writeErrors = error?.writeErrors || error?.result?.result?.writeErrors || [];
        const duplicateOnly =
            error?.code === 11000 ||
            (writeErrors.length > 0 &&
                writeErrors.every((writeError) => writeError?.code === 11000));

        if (!duplicateOnly) throw error;
        initialized = true;
    }

    // One-time migration: seeded sessions start hidden in the main table.
    // After version 2 is applied, later Show/Hide choices are never overwritten.
    await ManualSession.updateMany(
        {
            matchId,
            id: { $in: templates.map((session) => session.id) },
            visibilityVersion: { $ne: 2 },
        },
        {
            $set: {
                isVisible: false,
                visibilityVersion: 2,
            },
        }
    );

    // Quotes are controlled by the backend dummy source and stay read-only in Support.
    await ManualSession.bulkWrite(
        templates.map((session) => ({
            updateOne: {
                filter: { matchId, id: session.id },
                update: {
                    $set: {
                        noRun: session.noRun,
                        noRate: session.noRate,
                        yesRate: session.yesRate,
                    },
                },
            },
        })),
        { ordered: false }
    );

    // YES RUN always follows the selected per-session rate difference.
    await ManualSession.updateMany(
        { matchId },
        [
            {
                $set: {
                    yesRun: {
                        $add: ["$noRun", { $ifNull: ["$rateDiff", 1] }],
                    },
                },
            },
        ],
        { updatePipeline: true }
    );

    const sessions = await ManualSession.find({ matchId })
        .sort({ displayOrder: 1 })
        .lean();
    return { sessions, initialized };
}

async function updateSession(matchId, sessionId, updates) {
    const nextUpdates = { ...updates };

    if (updates.rateDiff !== undefined) {
        const current = await ManualSession.findOne({ matchId, id: sessionId })
            .select("noRun")
            .lean();
        if (!current) return null;
        nextUpdates.yesRun = Number(current.noRun) + Number(updates.rateDiff);
    }

    return ManualSession.findOneAndUpdate(
        { matchId, id: sessionId },
        { $set: nextUpdates },
        { returnDocument: "after", runValidators: true }
    ).lean();
}

async function updateAllSessionStatuses(matchId, status) {
    if (status === "open") {
        // Bulk-open must not reopen a session explicitly suspended by Support.
        await ManualSession.updateMany(
            { matchId, manuallySuspended: { $ne: true } },
            { $set: { status: "open" } }
        );
    } else {
        // Bulk-suspend changes status only and preserves individual overrides.
        await ManualSession.updateMany({ matchId }, { $set: { status } });
    }
    return ManualSession.find({ matchId }).sort({ displayOrder: 1 }).lean();
}

async function resetSessions(matchId) {
    await ManualSession.deleteMany({ matchId });
    const sessions = await ManualSession.insertMany(cloneSessionsForMatch(matchId));
    return sessions.map((session) => session.toObject());
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
    getSessions,
    updateSession,
    updateAllSessionStatuses,
    resetSessions,
};
