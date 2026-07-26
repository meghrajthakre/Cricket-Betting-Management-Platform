"use strict";

const mongoose = require("mongoose");
const { Bet, BET_STATUS, BET_TYPE } = require("./bet.model");
const { updateUserCoins } = require("../ledger/ledger.service");
const ManualOptions = require("../../models/ManualModel/ManualOptions");
const ManualSettings = require("../../models/ManualModel/ManualSettings");
const ManualRunner = require("../../models/ManualModel/ManualRunner");
const Session = require("../../models/Session");
const { sessionTemplate } = require("../../services/sessionCatalog");
const { DEFAULT_OPTIONS } = require("../../services/manualOptionsService");
const { User } = require("../../models/User");
const { Ledger } = require("../ledger/ledger.model");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const normalizeRate = (value) => {
    const rate = Number(value);
    return Number.isFinite(rate) ? Number(rate.toFixed(2)) : NaN;
};

const acceptCurrentMarketRate = (requestedRate, currentRate) => {
    const requested = normalizeRate(requestedRate);
    const current = normalizeRate(currentRate);

    if (!Number.isFinite(current) || current < 1) {
        const error = new Error("Current market rate is unavailable");
        error.statusCode = 409;
        error.code = "MARKET_RATE_UNAVAILABLE";
        throw error;
    }

    if (requested !== current) {
        const error = new Error(`Rate changed from ${requested} to ${current}. Please review and try again.`);
        error.statusCode = 409;
        error.code = "PRICE_CHANGED";
        error.currentRate = current;
        throw error;
    }

    return current;
};

const waitForBetDelay = async (delaySeconds) => {
    const seconds = Number(delaySeconds);
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
};

const loadBetMarketState = async ({
    matchId,
    marketId,
    marketType,
    type,
    requestedRate,
    requestedSessionRate,
    amount,
}) => {
    const [storedOptions, settings] = await Promise.all([
        ManualOptions.findOne({ matchId }).lean(),
        ManualSettings.findOne({ matchId }).lean(),
    ]);
    const options = { ...DEFAULT_OPTIONS, ...(storedOptions || {}) };

    if (settings && (settings.betLock || settings.marketStatus !== "OPEN")) {
        throw new Error("Match betting is currently closed");
    }

    let maxBet;
    let delaySeconds;
    let currentRate;
    let currentSessionRate;

    if (marketType === "session") {
        if (settings?.sessionLock) throw new Error("Session betting is currently locked");

        const session =
            await Session.findOne({ matchId, id: marketId }).lean() ||
            sessionTemplate(matchId, marketId);
        if (!session) throw new Error("Session market not found");
        if (!session.isVisible || session.status !== "open" || session.lockStatus === "lock") {
            throw new Error("Session market is not open");
        }

        maxBet = Math.min(
            Number(options.sessionMaxBet),
            Number(session.maxAmount)
        );
        delaySeconds = Number(options.sessionDelay) || 0;
        currentRate = type === BET_TYPE.YES ? session.yesRun : session.noRun;
        currentSessionRate = type === BET_TYPE.YES ? session.yesRate : session.noRate;
    } else {
        const runner = await ManualRunner.findOne({ matchId, runnerId: marketId }).lean();
        if (!runner) throw new Error("Match runner not found");
        if (runner.status !== "open") throw new Error("Match runner is suspended");

        maxBet = Number(options.matchMaxBet);
        delaySeconds = Number(options.matchDelay) || 0;
        currentRate = type === BET_TYPE.YES ? runner.lagai : runner.khai;
    }

    if (!Number.isFinite(maxBet) || maxBet <= 0) {
        throw new Error(`${marketType === "session" ? "Session" : "Match"} betting is disabled`);
    }
    if (amount > maxBet) {
        throw new Error(`Maximum ${marketType} bet allowed is ${maxBet}`);
    }
    if (
        marketType === "session" &&
        requestedSessionRate !== undefined &&
        normalizeRate(requestedSessionRate) !== normalizeRate(currentSessionRate)
    ) {
        const error = new Error("Session rate changed. Please review and try again.");
        error.statusCode = 409;
        error.code = "PRICE_CHANGED";
        throw error;
    }

    return {
        acceptedRate: acceptCurrentMarketRate(requestedRate, currentRate),
        acceptedSessionRate: marketType === "session" ? normalizeRate(currentSessionRate) : undefined,
        delaySeconds,
        maxBet,
    };
};

/**
 * Calculates profit and liability for a rate-based Indian bet.
 *
 * YES (Lagai — backing the outcome):
 *   profit    = (rate × amount) / 100   ← what you WIN
 *   liability = amount                  ← what you RISK / lose
 *
 * NO (Khai — laying the outcome):
 *   profit    = amount                  ← what you WIN
 *   liability = (rate × amount) / 100   ← what you RISK / lose
 *
 * @param {"yes"|"no"} type
 * @param {number} amount
 * @param {number} rate
 * @returns {{ profit: number, liability: number }}
 */
const calculateBetFinancials = (type, amount, rate) => {
    if (type === BET_TYPE.YES) {
        const profit    = parseFloat(((rate * amount) / 100).toFixed(2));
        const liability = parseFloat(amount.toFixed(2));
        return { profit, liability };
    }

    // type === BET_TYPE.NO
    const profit    = parseFloat(amount.toFixed(2));
    const liability = parseFloat(((rate * amount) / 100).toFixed(2));
    return { profit, liability };
};

const calculateSessionFinancials = (type, amount, sessionRate) => {
    const multiplier = Number(sessionRate);
    if (!Number.isFinite(multiplier) || multiplier <= 0) {
        throw new Error("Session payout rate is unavailable");
    }
    if (type === BET_TYPE.YES) {
        return {
            profit: Number((amount * multiplier).toFixed(2)),
            liability: Number(amount.toFixed(2)),
        };
    }
    return {
        profit: Number(amount.toFixed(2)),
        liability: Number((amount * multiplier).toFixed(2)),
    };
};

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Places a bet for a user using the Indian khai/lagai rate system.
 *
 * Only the `liability` (loss) is debited at placement — NOT the full amount.
 *
 * @param {string}      userId  - User placing the bet
 * @param {string}      matchId - Match the bet is on
 * @param {number}      amount  - Face-value stake
 * @param {number}      rate    - Indian percentage rate (e.g. 90)
 * @param {"yes"|"no"}  type    - Lagai (yes) or Khai (no)
 * @returns {Promise<import("./bet.model").Bet>}
 */
const placeBet = async (
    userId,
    matchId,
    amount,
    rate,
    type,
    marketType = "match",
    marketId = "",
    requestedSessionRate
) => {
    // --- Validate inputs -------------------------------------------------------
    if (!amount || amount <= 0) {
        throw new Error("Bet amount must be greater than 0");
    }
    if (!rate || rate <= 0) {
        throw new Error("Rate must be greater than 0");
    }
    if (!Object.values(BET_TYPE).includes(type)) {
        throw new Error(`Bet type must be one of: ${Object.values(BET_TYPE).join(", ")}`);
    }

    if (!["match", "session"].includes(marketType)) {
        throw new Error("marketType must be match or session");
    }

    if (marketType === "match" && !marketId) {
        throw new Error("marketId is required for match bets");
    }
    if (marketType === "session" && !marketId) {
        throw new Error("marketId is required for session bets");
    }

    // Validate the user's displayed price immediately, wait for the configured
    // in-play delay, then load everything again. The second read is authoritative:
    // a changed price, suspended market, lock, or reduced limit rejects the bet.
    const initialMarket = await loadBetMarketState({
        matchId,
        marketId,
        marketType,
        type,
        requestedRate: rate,
        requestedSessionRate,
        amount,
    });
    await waitForBetDelay(initialMarket.delaySeconds);
    const finalMarket = await loadBetMarketState({
        matchId,
        marketId,
        marketType,
        type,
        requestedRate: initialMarket.acceptedRate,
        requestedSessionRate: initialMarket.acceptedSessionRate,
        amount,
    });
    const acceptedRate = finalMarket.acceptedRate;

    // --- Calculate financials --------------------------------------------------
    const { profit, liability } = marketType === "session"
        ? calculateSessionFinancials(type, amount, finalMarket.acceptedSessionRate)
        : calculateBetFinancials(type, amount, acceptedRate);

    // Sessions currently keep independent liability accounting.
    if (marketType === "session") {
        const dbSession = await mongoose.startSession();
        let sessionBet;
        let updatedBalance;

        try {
            await dbSession.withTransaction(async () => {
                const user = await User.findById(userId).session(dbSession);
                if (!user) throw new Error("User not found");

                const balanceBefore = Number(user.coins);
                const balanceAfter = Number((balanceBefore - liability).toFixed(2));
                if (balanceAfter < 0) {
                    throw new Error(
                        `Insufficient balance. Required: ${liability}, Available: ${balanceBefore}`
                    );
                }

                await Ledger.create([{
                    userId,
                    amount: liability,
                    type: "debit",
                    reason: `${type.toUpperCase()} session bet placed on match ${matchId} (liability)`,
                    createdBy: userId,
                    balanceBefore,
                    balanceAfter,
                }], { session: dbSession });

                user.coins = balanceAfter;
                await user.save({ session: dbSession });

                [sessionBet] = await Bet.create([{
                    userId,
                    matchId,
                    marketType,
                    marketId,
                    amount,
                    rate: acceptedRate,
                    sessionRun: acceptedRate,
                    sessionRate: finalMarket.acceptedSessionRate,
                    type,
                    profit,
                    loss: liability,
                    walletAdjustment: liability,
                    status: BET_STATUS.PENDING,
                }], { session: dbSession });

                updatedBalance = balanceAfter;
            });
        } finally {
            await dbSession.endSession();
        }

        return { bet: sessionBet, balance: updatedBalance };
    }

    // Reserve only the worst-case NET loss across all runners. This transaction
    // also credits collateral back when a new bet reduces that exposure.
    const dbSession = await mongoose.startSession();
    let bet;
    let updatedBalance;

    try {
        await dbSession.withTransaction(async () => {
            const [runnerDocs, pendingBets, user] = await Promise.all([
                ManualRunner.find({ matchId }).select("runnerId").session(dbSession).lean(),
                Bet.find({ userId, matchId, marketType: "match", status: BET_STATUS.PENDING })
                    .session(dbSession)
                    .lean(),
                User.findById(userId).session(dbSession),
            ]);

            if (!user) throw new Error("User not found");

            const runnerIds = runnerDocs.map((item) => item.runnerId);
            if (runnerIds.length < 2 || !runnerIds.includes(marketId)) {
                throw new Error("Match runners are not available for exposure calculation");
            }

            const positions = Object.fromEntries(runnerIds.map((runnerId) => [runnerId, 0]));
            pendingBets.forEach((pendingBet) => addBetToPositions(positions, runnerIds, pendingBet));

            // Legacy bets have no adjustment field and had their whole loss debited.
            const currentlyReserved = Number(pendingBets.reduce((total, pendingBet) => {
                const movement = pendingBet.walletAdjustment == null
                    ? Number(pendingBet.loss)
                    : Number(pendingBet.walletAdjustment);
                return total + movement;
            }, 0).toFixed(2));

            addBetToPositions(positions, runnerIds, { marketId, type, profit, loss: liability });
            const exposureAfter = requiredExposure(positions);
            const walletAdjustment = Number((exposureAfter - currentlyReserved).toFixed(2));
            const balanceBefore = Number(user.coins);
            const balanceAfter = Number((balanceBefore - walletAdjustment).toFixed(2));
            updatedBalance = balanceAfter;

            if (balanceAfter < 0) {
                throw new Error(
                    `Insufficient balance. Additional required: ${walletAdjustment}, Available: ${balanceBefore}`
                );
            }

            if (walletAdjustment !== 0) {
                await Ledger.create([{
                    userId,
                    amount: Math.abs(walletAdjustment),
                    type: walletAdjustment > 0 ? "debit" : "credit",
                    reason: walletAdjustment > 0
                        ? `Match ${matchId} net exposure increased`
                        : `Match ${matchId} hedge exposure released`,
                    createdBy: userId,
                    balanceBefore,
                    balanceAfter,
                }], { session: dbSession });

                user.coins = balanceAfter;
                await user.save({ session: dbSession });
            }

            [bet] = await Bet.create([{
                userId, matchId, marketType, marketId, amount, rate: acceptedRate, type, profit,
                loss: liability,
                walletAdjustment,
                status: BET_STATUS.PENDING,
            }], { session: dbSession });

            console.log(
                `[placeBet] Match=${matchId} | Exposure=${exposureAfter} | ` +
                `WalletAdjustment=${walletAdjustment} | Balance=${balanceBefore}->${balanceAfter}`
            );
        });
    } finally {
        await dbSession.endSession();
    }

    console.log(`[placeBet] Bet created: betId=${bet._id}`);
    return { bet, balance: updatedBalance };
};

/**
 * Settles a pending bet.
 *
 * WIN  → credit (profit + liability)  [liability was already debited at placement]
 * LOSE → do nothing                   [liability was already debited at placement]
 *
 * @param {string}  betId      - Bet to settle
 * @param {boolean} won        - Whether the bet won
 * @param {string}  settledBy  - Admin / system user performing settlement
 * @returns {Promise<import("./bet.model").Bet>}
 */
const settleBet = async (betId, won, settledBy) => {
    // --- Fetch & guard ---------------------------------------------------------
    const bet = await Bet.findById(betId);
    if (!bet) {
        throw new Error("Bet not found");
    }
    if (bet.status !== BET_STATUS.PENDING) {
        throw new Error(`Bet has already been settled (current status: ${bet.status})`);
    }

    // --- Determine outcome -----------------------------------------------------
    const newStatus = won ? BET_STATUS.WON : BET_STATUS.LOST;

    /*
     * On a WIN we return the liability the user originally risked
     * PLUS the profit they earned.
     *
     *   creditAmount = profit + loss  (loss === liability that was debited)
     *
     * On a LOSS nothing is credited — the liability is already gone.
     */
    const creditAmount = won ? parseFloat((bet.profit + bet.loss).toFixed(2)) : 0;

    // --- Update bet record first (guard against double-settlement) ------------
    bet.status    = newStatus;
    bet.settledAt = new Date();
    bet.settledBy = settledBy;
    await bet.save();

    // --- Credit wallet on win --------------------------------------------------
    if (won) {
        await updateUserCoins(
            bet.userId,
            creditAmount,
            "credit",
            `${bet.type.toUpperCase()} bet won on match ${bet.matchId} (profit + liability returned)`,
            settledBy
        );
    }

    console.log(
        `[settleBet] betId=${betId} | Status=${newStatus} | ` +
        `Credited=${creditAmount} | SettledBy=${settledBy}`
    );

    return bet;
};

const addBetToPositions = (positions, runnerIds, bet) => {
    const profit = Number(bet.profit) || 0;
    const liability = Number(bet.loss) || 0;

    for (const runnerId of runnerIds) {
        if (bet.type === BET_TYPE.YES) {
            positions[runnerId] += runnerId === bet.marketId ? profit : -liability;
        } else {
            positions[runnerId] += runnerId === bet.marketId ? -liability : profit;
        }
        positions[runnerId] = Number(positions[runnerId].toFixed(2));
    }
};

const requiredExposure = (positions) => Number(
    Math.max(0, ...Object.values(positions).map((value) => -Number(value))).toFixed(2)
);

/** Returns the authenticated user's bets for one match, newest first. */
const getUserMatchBets = async (userId, matchId) => {
    if (!matchId) throw new Error("matchId is required");

    return Bet.find({ userId, matchId })
        .sort({ createdAt: -1 })
        .lean();
};

module.exports = {
    placeBet,
    settleBet,
    getUserMatchBets,
    acceptCurrentMarketRate,
    waitForBetDelay,
    calculateBetFinancials,
    calculateSessionFinancials,
    addBetToPositions,
    requiredExposure,
};
