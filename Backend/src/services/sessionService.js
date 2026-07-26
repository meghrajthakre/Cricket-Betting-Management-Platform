"use strict";

const mongoose = require("mongoose");
const Session = require("../models/Session");
const dummySessions = require("../data/dummySessions");
const { Bet, BET_STATUS, BET_TYPE } = require("../modules/bet/bet.model");
const { User } = require("../models/User");
const { Ledger } = require("../modules/ledger/ledger.model");
const AppError = require("../utils/AppError");

let sessionIndexesReady;

async function migrateLegacySessions(matchId) {
  const existingSession = await Session.exists({ matchId });
  if (existingSession) return;

  const legacyCollection = mongoose.connection.collection("manualsessions");
  const legacySessions = await legacyCollection.find({ matchId }).toArray();
  if (!legacySessions.length) return;

  try {
    await Session.collection.insertMany(legacySessions, { ordered: false });
  } catch (error) {
    const writeErrors = error?.writeErrors || [];
    const duplicateOnly =
      error?.code === 11000 ||
      (writeErrors.length > 0 && writeErrors.every((item) => item?.code === 11000));
    if (!duplicateOnly) throw error;
  }
}

async function ensureSessionIndexes() {
  if (!sessionIndexesReady) {
    sessionIndexesReady = Session.syncIndexes().catch((error) => {
      sessionIndexesReady = null;
      throw error;
    });
  }
  return sessionIndexesReady;
}

const cloneSessionsForMatch = (matchId) =>
  dummySessions.map((session) => ({ ...session, matchId }));

async function getSessions(matchId) {
  await migrateLegacySessions(matchId);
  await ensureSessionIndexes();
  const templates = cloneSessionsForMatch(matchId);
  let initialized = false;

  try {
    const result = await Session.bulkWrite(
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
    const writeErrors = error?.writeErrors || error?.result?.result?.writeErrors || [];
    const duplicateOnly =
      error?.code === 11000 ||
      (writeErrors.length > 0 && writeErrors.every((item) => item?.code === 11000));
    if (!duplicateOnly) throw error;
    initialized = true;
  }

  await Session.updateMany(
    {
      matchId,
      id: { $in: templates.map((session) => session.id) },
      visibilityVersion: { $ne: 2 },
    },
    { $set: { isVisible: false, visibilityVersion: 2 } }
  );

  await Session.bulkWrite(
    templates.map((session) => ({
      updateOne: {
        filter: { matchId, id: session.id, resultStatus: { $ne: "settled" } },
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

  await Session.updateMany(
    { matchId, resultStatus: { $ne: "settled" } },
    [{ $set: { yesRun: { $add: ["$noRun", { $ifNull: ["$rateDiff", 1] }] } } }],
    { updatePipeline: true }
  );

  const sessions = await Session.find({ matchId }).sort({ displayOrder: 1 }).lean();
  return { sessions, initialized };
}

async function getPendingBetSessions(matchId) {
  await migrateLegacySessions(matchId);
  const counts = await Bet.aggregate([
    {
      $match: {
        matchId,
        marketType: "session",
        status: BET_STATUS.PENDING,
      },
    },
    { $group: { _id: "$marketId", pendingBetCount: { $sum: 1 } } },
  ]);
  if (!counts.length) return [];

  const countBySessionId = new Map(
    counts.map((item) => [String(item._id), item.pendingBetCount])
  );
  const sessions = await Session.find({
    matchId,
    id: { $in: [...countBySessionId.keys()] },
    resultStatus: { $ne: "settled" },
  }).sort({ displayOrder: 1 }).lean();

  return sessions.map((session) => ({
    ...session,
    pendingBetCount: countBySessionId.get(String(session.id)) || 0,
  }));
}

async function updateSession(matchId, sessionId, updates) {
  await migrateLegacySessions(matchId);
  const current = await Session.findOne({ matchId, id: sessionId }).lean();
  if (!current) return null;
  if (current.resultStatus === "settled") {
    throw new AppError("Settled session cannot be changed", 409);
  }

  const nextUpdates = { ...updates };
  if (updates.rateDiff !== undefined) {
    nextUpdates.yesRun = Number(current.noRun) + Number(updates.rateDiff);
  }

  return Session.findOneAndUpdate(
    { matchId, id: sessionId, resultStatus: { $ne: "settled" } },
    { $set: nextUpdates },
    { returnDocument: "after", runValidators: true }
  ).lean();
}

async function updateAllSessionStatuses(matchId, status) {
  await migrateLegacySessions(matchId);
  const unsettled = { matchId, resultStatus: { $ne: "settled" } };
  if (status === "open") {
    await Session.updateMany(
      { ...unsettled, manuallySuspended: { $ne: true } },
      { $set: { status: "open" } }
    );
  } else {
    await Session.updateMany(unsettled, { $set: { status } });
  }
  return Session.find({ matchId }).sort({ displayOrder: 1 }).lean();
}

async function resetSessions(matchId) {
  await migrateLegacySessions(matchId);
  const pendingBets = await Bet.exists({
    matchId,
    marketType: "session",
    status: BET_STATUS.PENDING,
  });
  if (pendingBets) {
    throw new AppError("Pending session bets must be settled before reset", 409);
  }
  await Session.deleteMany({ matchId });
  const sessions = await Session.insertMany(cloneSessionsForMatch(matchId));
  return sessions.map((session) => session.toObject());
}

function sessionBetWon(bet, resultRun) {
  const line = Number(bet.sessionRun ?? bet.rate);
  return bet.type === BET_TYPE.YES
    ? Number(resultRun) >= line
    : Number(resultRun) < line;
}

async function settleSession(matchId, sessionId, resultRun, settledBy) {
  await migrateLegacySessions(matchId);
  const numericResult = Number(resultRun);
  if (!Number.isFinite(numericResult) || numericResult < 0) {
    throw new AppError("resultRun must be a valid non-negative number", 400);
  }

  const dbSession = await mongoose.startSession();
  let summary;

  try {
    await dbSession.withTransaction(async () => {
      const session = await Session.findOne({ matchId, id: sessionId }).session(dbSession);
      if (!session) throw new AppError("Session not found", 404);
      if (session.resultStatus === "settled") {
        throw new AppError("Session has already been settled", 409);
      }

      const bets = await Bet.find({
        matchId,
        marketType: "session",
        marketId: sessionId,
        status: BET_STATUS.PENDING,
      }).session(dbSession);

      let won = 0;
      let lost = 0;
      let totalCredit = 0;

      for (const bet of bets) {
        const isWon = sessionBetWon(bet, numericResult);
        bet.status = isWon ? BET_STATUS.WON : BET_STATUS.LOST;
        bet.resultRun = numericResult;
        bet.settledAt = new Date();
        bet.settledBy = settledBy;

        if (isWon) {
          const creditAmount = Number((Number(bet.profit) + Number(bet.loss)).toFixed(2));
          const user = await User.findById(bet.userId).session(dbSession);
          if (!user) throw new AppError(`User not found for bet ${bet._id}`, 404);

          const balanceBefore = Number(user.coins);
          const balanceAfter = Number((balanceBefore + creditAmount).toFixed(2));
          await Ledger.create([{
            userId: bet.userId,
            amount: creditAmount,
            type: "credit",
            reason: `${bet.type.toUpperCase()} session bet won on ${session.sessionName}`,
            createdBy: settledBy,
            balanceBefore,
            balanceAfter,
          }], { session: dbSession });
          user.coins = balanceAfter;
          await user.save({ session: dbSession });
          totalCredit = Number((totalCredit + creditAmount).toFixed(2));
          won += 1;
        } else {
          lost += 1;
        }

        await bet.save({ session: dbSession });
      }

      session.resultRun = numericResult;
      session.resultStatus = "settled";
      session.status = "closed";
      session.lockStatus = "lock";
      session.settledAt = new Date();
      session.settledBy = settledBy;
      await session.save({ session: dbSession });

      summary = {
        session: session.toObject(),
        totalBets: bets.length,
        won,
        lost,
        totalCredit,
      };
    });
  } finally {
    await dbSession.endSession();
  }

  return summary;
}

module.exports = {
  getSessions,
  getPendingBetSessions,
  updateSession,
  updateAllSessionStatuses,
  resetSessions,
  sessionBetWon,
  settleSession,
};
