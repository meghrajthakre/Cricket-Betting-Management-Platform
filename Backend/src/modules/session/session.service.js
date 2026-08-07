"use strict";

const mongoose = require("mongoose");
const Session = require("./session.model");
const { sessionTemplate, sessionTemplates } = require("./session.catalog");
const { Bet, BET_STATUS, BET_TYPE } = require("../bet/bet.model");
const { User } = require("../user/user.model");
const { Ledger } = require("../ledger/ledger.model");
const AppError = require("../../utils/AppError");

let sessionIndexesReady;

async function ensureSessionIndexes() {
  if (!sessionIndexesReady) {
    sessionIndexesReady = Session.syncIndexes().catch((error) => {
      sessionIndexesReady = null;
      throw error;
    });
  }
  return sessionIndexesReady;
}

async function getSessions(matchId) {
  await ensureSessionIndexes();
  const [templates, storedSessions] = await Promise.all([
    Promise.resolve(sessionTemplates(matchId)),
    Session.find({ matchId }).lean(),
  ]);
  const storedById = new Map(storedSessions.map((session) => [String(session.id), session]));
  const templateIds = new Set(templates.map((session) => String(session.id)));
  const sessions = templates.map((template) => storedById.get(String(template.id)) || template);
  sessions.push(...storedSessions.filter((session) => !templateIds.has(String(session.id))));
  sessions.sort((a, b) => Number(a.displayOrder) - Number(b.displayOrder));
  return { sessions, initialized: false };
}

async function getPendingBetSessions(matchId) {
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
  const storedSessions = await Session.find({
    matchId,
    id: { $in: [...countBySessionId.keys()] },
    resultStatus: { $ne: "settled" },
  }).lean();
  const storedById = new Map(storedSessions.map((session) => [String(session.id), session]));
  const sessions = [...countBySessionId.keys()]
    .map((sessionId) => storedById.get(sessionId) || sessionTemplate(matchId, sessionId))
    .filter(Boolean)
    .sort((a, b) => Number(a.displayOrder) - Number(b.displayOrder));

  return sessions.map((session) => ({
    ...session,
    pendingBetCount: countBySessionId.get(String(session.id)) || 0,
  }));
}

async function updateSession(matchId, sessionId, updates) {
  const storedCurrent = await Session.findOne({ matchId, id: sessionId }).lean();
  const current = storedCurrent || sessionTemplate(matchId, sessionId);
  if (!current) return null;
  if (current.resultStatus === "settled") {
    throw new AppError("Settled session cannot be changed", 409);
  }

  const nextUpdates = { ...updates };
  if (updates.rateDiff !== undefined) {
    nextUpdates.yesRun = Number(current.noRun) + Number(updates.rateDiff);
  }

  if (!storedCurrent) {
    const created = await Session.create({ ...current, ...nextUpdates });
    return created.toObject();
  }

  return Session.findOneAndUpdate(
    { matchId, id: sessionId },
    { $set: nextUpdates },
    { returnDocument: "after", runValidators: true }
  ).lean();
}

async function updateAllSessionStatuses(matchId, status) {
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
  const pendingBets = await Bet.exists({
    matchId,
    marketType: "session",
    status: BET_STATUS.PENDING,
  });
  if (pendingBets) {
    throw new AppError("Pending session bets must be settled before reset", 409);
  }
  await Session.deleteMany({ matchId });
  return sessionTemplates(matchId);
}

function sessionBetWon(bet, resultRun) {
  const line = Number(bet.sessionRun ?? bet.rate);
  return bet.type === BET_TYPE.YES
    ? Number(resultRun) >= line
    : Number(resultRun) < line;
}

async function settleSession(matchId, sessionId, resultRun, settledBy) {
  const numericResult = Number(resultRun);
  if (!Number.isFinite(numericResult) || numericResult < 0) {
    throw new AppError("resultRun must be a valid non-negative number", 400);
  }

  const dbSession = await mongoose.startSession();
  let summary;

  try {
    await dbSession.withTransaction(async () => {
      let session = await Session.findOne({ matchId, id: sessionId }).session(dbSession);
      if (!session) {
        const template = sessionTemplate(matchId, sessionId);
        if (!template) throw new AppError("Session not found", 404);
        [session] = await Session.create([template], { session: dbSession });
      }
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

      session.preSettlementState = {
        status: session.status,
        lockStatus: session.lockStatus,
        isVisible: session.isVisible,
      };
      session.resultRun = numericResult;
      session.resultStatus = "settled";
      session.status = "closed";
      session.lockStatus = "lock";
      session.isVisible = false;
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

async function reverseSessionSettlement(matchId, sessionId, reversedBy) {
  const dbSession = await mongoose.startSession();
  let summary;

  try {
    await dbSession.withTransaction(async () => {
      const session = await Session.findOne({ matchId, id: sessionId }).session(dbSession);
      if (!session) throw new AppError("Session not found", 404);
      if (session.resultStatus !== "settled") {
        throw new AppError("Only a settled session can be reversed", 409);
      }

      const bets = await Bet.find({
        matchId,
        marketType: "session",
        marketId: sessionId,
        status: { $in: [BET_STATUS.WON, BET_STATUS.LOST] },
      }).session(dbSession);

      let reversedCredit = 0;
      for (const bet of bets) {
        if (bet.status === BET_STATUS.WON) {
          const creditAmount = Number((Number(bet.profit) + Number(bet.loss)).toFixed(2));
          const user = await User.findById(bet.userId).session(dbSession);
          if (!user) throw new AppError(`User not found for bet ${bet._id}`, 404);

          const balanceBefore = Number(user.coins);
          if (balanceBefore < creditAmount) {
            throw new AppError(
              `Cannot reverse: user ${user.username || bet.userId} has insufficient balance`,
              409
            );
          }
          const balanceAfter = Number((balanceBefore - creditAmount).toFixed(2));
          await Ledger.create([{
            userId: bet.userId,
            amount: creditAmount,
            type: "debit",
            reason: `Reversed settlement of ${session.sessionName}`,
            createdBy: reversedBy,
            balanceBefore,
            balanceAfter,
          }], { session: dbSession });
          user.coins = balanceAfter;
          await user.save({ session: dbSession });
          reversedCredit = Number((reversedCredit + creditAmount).toFixed(2));
        }

        bet.status = BET_STATUS.PENDING;
        bet.resultRun = undefined;
        bet.settledAt = undefined;
        bet.settledBy = undefined;
        await bet.save({ session: dbSession });
      }

      const previous = session.preSettlementState || {};
      session.resultStatus = "pending";
      session.resultRun = null;
      session.status = previous.status || "suspend";
      session.lockStatus = previous.lockStatus || "lock";
      session.isVisible = previous.isVisible ?? false;
      session.settledAt = null;
      session.settledBy = null;
      session.preSettlementState = undefined;
      await session.save({ session: dbSession });

      summary = {
        session: session.toObject(),
        restoredBets: bets.length,
        reversedCredit,
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
  reverseSessionSettlement,
};
