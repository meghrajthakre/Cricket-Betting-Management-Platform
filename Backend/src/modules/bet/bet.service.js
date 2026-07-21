"use strict";

const mongoose = require("mongoose");
const { Bet, BET_STATUS, BET_TYPE } = require("./bet.model");
const { updateUserCoins } = require("../ledger/ledger.service");
const { getUserBalance } = require("../wallet/wallet.service");
const ManualOptions = require("../../models/ManualModel/ManualOptions");
const ManualSettings = require("../../models/ManualModel/ManualSettings");
const ManualRunner = require("../../models/ManualModel/ManualRunner");
const ManualSession = require("../../models/ManualModel/ManualSession");
const { DEFAULT_OPTIONS } = require("../../services/manualOptionsService");
const { User } = require("../../models/User");
const { Ledger } = require("../ledger/ledger.model");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
const placeBet = async (userId, matchId, amount, rate, type, marketType = "match", marketId = "") => {
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

    const [storedOptions, settings] = await Promise.all([
        ManualOptions.findOne({ matchId }).lean(),
        ManualSettings.findOne({ matchId }).lean(),
    ]);
    const options = { ...DEFAULT_OPTIONS, ...(storedOptions || {}) };

    if (settings && (settings.betLock || settings.marketStatus !== "OPEN")) {
        throw new Error("Match betting is currently closed");
    }

    let maxBet = Number(options.matchMaxBet);
    let delaySeconds = Number(options.matchDelay) || 0;
    let marketUpdatedAt = null;

    if (marketType === "session") {
        if (settings?.sessionLock) throw new Error("Session betting is currently locked");
        if (!marketId) throw new Error("marketId is required for session bets");

        const session = await ManualSession.findOne({ matchId, id: marketId }).lean();
        if (!session) throw new Error("Session market not found");
        if (!session.isVisible || session.status !== "open" || session.lockStatus === "lock") {
            throw new Error("Session market is not open");
        }

        const globalLimit = Number(options.sessionMaxBet);
        const sessionLimit = Number(session.maxAmount);
        maxBet = Math.min(globalLimit, sessionLimit);
        delaySeconds = Number(options.sessionDelay) || 0;
        marketUpdatedAt = session.updatedAt;
    } else if (marketId) {
        const runner = await ManualRunner.findOne({ matchId, runnerId: marketId }).lean();
        if (!runner) throw new Error("Match runner not found");
        if (runner.status !== "open") throw new Error("Match runner is suspended");
        marketUpdatedAt = runner.updatedAt;
    }

    if (!Number.isFinite(maxBet) || maxBet <= 0) {
        throw new Error(`${marketType === "session" ? "Session" : "Match"} betting is disabled`);
    }
    if (amount > maxBet) {
        throw new Error(`Maximum ${marketType} bet allowed is ${maxBet}`);
    }

    if (marketUpdatedAt && delaySeconds > 0) {
        const allowedAt = new Date(marketUpdatedAt).getTime() + delaySeconds * 1000;
        if (Date.now() < allowedAt) {
            throw new Error(`Please wait ${Math.ceil((allowedAt - Date.now()) / 1000)} second(s) before betting`);
        }
    }

    // --- Calculate financials --------------------------------------------------
    const { profit, liability } = calculateBetFinancials(type, amount, rate);

    // Sessions currently keep independent liability accounting.
    if (marketType === "session") {
        const balance = await getUserBalance(userId);
        if (balance < liability) {
            throw new Error(`Insufficient balance. Required: ${liability}, Available: ${balance}`);
        }

        await updateUserCoins(
            userId,
            liability,
            "debit",
            `${type.toUpperCase()} session bet placed on match ${matchId} (liability)`,
            userId
        );

        return Bet.create({
            userId, matchId, marketType, marketId, amount, rate, type, profit,
            loss: liability,
            walletAdjustment: liability,
            status: BET_STATUS.PENDING,
        });
    }

    if (!marketId) throw new Error("marketId is required for match bets");

    // Reserve only the worst-case NET loss across all runners. This transaction
    // also credits collateral back when a new bet reduces that exposure.
    const dbSession = await mongoose.startSession();
    let bet;

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
                userId, matchId, marketType, marketId, amount, rate, type, profit,
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
    return bet;
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

module.exports = { placeBet, settleBet, getUserMatchBets };
