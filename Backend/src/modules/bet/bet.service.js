"use strict";

const mongoose = require("mongoose");
const { Bet, BET_STATUS, BET_TYPE } = require("./bet.model");
const ManualOptions = require("../manual/manual-options.model");
const ManualSettings = require("../manual/manual-settings.model");
const ManualRunner = require("../manual/manual-runner.model");
const Session = require("../session/session.model");
const { DEFAULT_OPTIONS } = require("../manual/manual-options.service");
const { User, ROLES } = require("../user/user.model");
const { Ledger } = require("../ledger/ledger.model");
const SavedMatch = require("../saved-match/saved-match.model");
const { getCompanyShareBps, getViewerShareBps, scaleBetForShare, scaleBetForRemainder, scaleBetForViewer, resolveShareSnapshot } = require("./bet-share.service");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const serviceError = (message, statusCode = 400, code = "VALIDATION_ERROR", metadata = {}) =>
    Object.assign(new Error(message), { statusCode, code, ...metadata });

const normalizeRate = (value) => {
    if (typeof value !== "number" || !Number.isFinite(value)) return NaN;
    const normalized = Number(value.toFixed(2));
    return Number.isSafeInteger(Math.round(normalized * 100)) ? normalized : NaN;
};

const requireMoney = (value, field) => {
    const normalized = normalizeRate(value);
    if (!Number.isFinite(normalized) || normalized <= 0 || Math.abs(value - normalized) > Number.EPSILON) {
        throw serviceError(`${field} must be a positive finite number with at most two decimal places`);
    }
    return normalized;
};

const requireNonEmptyString = (value, field) => {
    if (typeof value !== "string" || !value.trim()) throw serviceError(`${field} must be a non-empty string`);
    return value.trim();
};

const validateBetUser = (user) => {
    if (!user) throw serviceError("User not found", 404, "USER_NOT_FOUND");
    if (user.role !== ROLES.USER) throw serviceError("Only betting users can place bets", 403, "USER_ROLE_FORBIDDEN");
    if (!user.isActive) throw serviceError("User account is blocked", 403, "USER_BLOCKED");
    if (!Number.isFinite(user.coins) || user.coins < 0) throw serviceError("User wallet is invalid", 409, "INVALID_WALLET");
};

const acceptCurrentMarketRate = (requestedRate, currentRate) => {
    const requested = normalizeRate(requestedRate);
    const current = normalizeRate(currentRate);

    if (!Number.isFinite(current) || current < 1) {
        throw serviceError("Current market rate is unavailable", 409, "MARKET_RATE_UNAVAILABLE");
    }

    if (requested !== current) {
        throw serviceError(`Rate changed from ${requested} to ${current}. Please review and try again.`, 409, "PRICE_CHANGED", { currentRate: current });
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
    dbSession,
}) => {
    const [storedOptions, settings] = await Promise.all([
        ManualOptions.findOne({ matchId }).session(dbSession || null).lean(),
        ManualSettings.findOne({ matchId }).session(dbSession || null).lean(),
    ]);
    const options = { ...DEFAULT_OPTIONS, ...(storedOptions || {}) };

    if (settings && (settings.betLock || settings.marketStatus !== "OPEN")) {
        throw serviceError("Match betting is currently closed", 409, "MARKET_CLOSED");
    }

    let maxBet;
    let delaySeconds;
    let currentRate;
    let currentSessionRate;

    if (marketType === "session") {
        if (settings?.sessionLock) throw serviceError("Session betting is currently locked", 409, "SESSION_LOCKED");

        const session = await Session.findOne({ matchId, id: marketId }).session(dbSession || null).lean();
        if (!session) throw serviceError("Session market not found", 404, "SESSION_NOT_FOUND");
        if (!session.isVisible || session.status !== "open" || session.lockStatus === "lock") {
            throw serviceError("Session market is not open", 409, "SESSION_NOT_OPEN");
        }

        maxBet = Math.min(
            Number(options.sessionMaxBet),
            Number(session.maxAmount)
        );
        delaySeconds = Number(options.sessionDelay) || 0;
        currentRate = type === BET_TYPE.YES ? session.yesRun : session.noRun;
        currentSessionRate = type === BET_TYPE.YES ? session.yesRate : session.noRate;
    } else {
        const runner = await ManualRunner.findOne({ matchId, runnerId: marketId }).session(dbSession || null).lean();
        if (!runner) throw serviceError("Match runner not found", 404, "RUNNER_NOT_FOUND");
        if (runner.status !== "open") throw serviceError("Match runner is suspended", 409, "RUNNER_SUSPENDED");

        maxBet = Number(options.matchMaxBet);
        delaySeconds = Number(options.matchDelay) || 0;
        currentRate = type === BET_TYPE.YES ? runner.lagai : runner.khai;
    }

    if (!Number.isFinite(maxBet) || maxBet <= 0) {
        throw serviceError(`${marketType === "session" ? "Session" : "Match"} betting is disabled`, 409, "BETTING_DISABLED");
    }
    if (amount > maxBet) {
        throw serviceError(`Maximum ${marketType} bet allowed is ${maxBet}`, 409, "MAX_BET_EXCEEDED");
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
    const safeAmount = requireMoney(amount, "amount");
    const safeRate = requireMoney(rate, "rate");
    if (type === BET_TYPE.YES) {
        const profit    = Number(((safeRate * safeAmount) / 100).toFixed(2));
        const liability = safeAmount;
        return { profit, liability };
    }
    if (type === BET_TYPE.NO) {
        const profit    = safeAmount;
        const liability = Number(((safeRate * safeAmount) / 100).toFixed(2));
        return { profit, liability };
    }
    throw serviceError(`Bet type must be one of: ${Object.values(BET_TYPE).join(", ")}`);
};

const calculateSessionFinancials = (type, amount, sessionRate) => {
    const safeAmount = requireMoney(amount, "amount");
    const multiplier = requireMoney(sessionRate, "sessionRate");
    if (type === BET_TYPE.YES) {
        return {
            profit: Number((safeAmount * multiplier).toFixed(2)),
            liability: safeAmount,
        };
    }
    if (type === BET_TYPE.NO) {
        return {
            profit: safeAmount,
            liability: Number((safeAmount * multiplier).toFixed(2)),
        };
    }
    throw serviceError(`Bet type must be one of: ${Object.values(BET_TYPE).join(", ")}`);
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
    requestedSessionRate,
    clientBetId
) => {
    // --- Validate inputs -------------------------------------------------------
    if (!mongoose.Types.ObjectId.isValid(userId)) throw serviceError("userId must be a valid ObjectId");
    matchId = requireNonEmptyString(matchId, "matchId");
    marketId = requireNonEmptyString(marketId, "marketId");
    amount = requireMoney(amount, "amount");
    rate = requireMoney(rate, "rate");
    if (!Object.values(BET_TYPE).includes(type)) {
        throw serviceError(`Bet type must be one of: ${Object.values(BET_TYPE).join(", ")}`);
    }

    if (!["match", "session"].includes(marketType)) {
        throw serviceError("marketType must be match or session");
    }
    if (marketType === "session") requestedSessionRate = requireMoney(requestedSessionRate, "requestedSessionRate");
    if (clientBetId !== undefined) clientBetId = requireNonEmptyString(clientBetId, "clientBetId");

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
                validateBetUser(user);
                await loadBetMarketState({ matchId, marketId, marketType, type, requestedRate: acceptedRate, requestedSessionRate: finalMarket.acceptedSessionRate, amount, dbSession });
                if (clientBetId) {
                    const existing = await Bet.findOne({ userId, clientBetId }).session(dbSession);
                    if (existing) throw serviceError("Duplicate bet request", 409, "DUPLICATE_BET");
                }
                const shareSnapshot = await resolveShareSnapshot(user, dbSession);
                const betId = new mongoose.Types.ObjectId();
                const correlationId = clientBetId || `bet:${betId}`;

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
                    transactionCode: "SESSION_BET_LIABILITY_RESERVED",
                    referenceType: "bet",
                    referenceId: String(betId),
                    correlationId,
                    matchId,
                    marketType,
                    marketId,
                }], { session: dbSession });

                user.coins = balanceAfter;
                await user.save({ session: dbSession });

                [sessionBet] = await Bet.create([{
                    _id: betId,
                    userId,
                    ...shareSnapshot,
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
                    clientBetId,
                    correlationId,
                    status: BET_STATUS.PENDING,
                }], { session: dbSession });

                updatedBalance = balanceAfter;
            });
        } catch (error) {
            if (error?.code === 11000 && error?.keyPattern?.clientBetId) throw serviceError("Duplicate bet request", 409, "DUPLICATE_BET");
            throw error;
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

            validateBetUser(user);
            await loadBetMarketState({ matchId, marketId, marketType, type, requestedRate: acceptedRate, amount, dbSession });
            if (clientBetId) {
                const existing = await Bet.findOne({ userId, clientBetId }).session(dbSession);
                if (existing) throw serviceError("Duplicate bet request", 409, "DUPLICATE_BET");
            }
            const shareSnapshot = await resolveShareSnapshot(user, dbSession);
            const betId = new mongoose.Types.ObjectId();
            const correlationId = clientBetId || `bet:${betId}`;

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
                    transactionCode: walletAdjustment > 0
                        ? "MATCH_EXPOSURE_RESERVED"
                        : "MATCH_HEDGE_EXPOSURE_RELEASED",
                    referenceType: "bet",
                    referenceId: String(betId),
                    correlationId,
                    matchId,
                    marketType,
                    marketId,
                }], { session: dbSession });

                user.coins = balanceAfter;
                await user.save({ session: dbSession });
            }

            [bet] = await Bet.create([{
                _id: betId, userId, ...shareSnapshot, matchId, marketType, marketId, amount, rate: acceptedRate, type, profit,
                loss: liability,
                walletAdjustment,
                clientBetId,
                correlationId,
                status: BET_STATUS.PENDING,
            }], { session: dbSession });

            console.log(
                `[placeBet] Match=${matchId} | Exposure=${exposureAfter} | ` +
                `WalletAdjustment=${walletAdjustment} | Balance=${balanceBefore}->${balanceAfter}`
            );
        });
    } catch (error) {
        if (error?.code === 11000 && error?.keyPattern?.clientBetId) throw serviceError("Duplicate bet request", 409, "DUPLICATE_BET");
        throw error;
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
const unsafeSettleBetLegacy = async (betId, won, settledBy) => {
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
    if (!positions || typeof positions !== "object" || !Array.isArray(runnerIds)) throw serviceError("Invalid positions");
    if (!runnerIds.includes(bet.marketId)) throw serviceError("Unknown runner ID");
    if (!Object.values(BET_TYPE).includes(bet.type)) throw serviceError("Invalid bet type");
    const profit = requireMoney(bet.profit, "profit");
    const liability = requireMoney(bet.loss, "loss");

    for (const runnerId of runnerIds) {
        if (bet.type === BET_TYPE.YES) {
            positions[runnerId] += runnerId === bet.marketId ? profit : -liability;
        } else if (bet.type === BET_TYPE.NO) {
            positions[runnerId] += runnerId === bet.marketId ? -liability : profit;
        }
        positions[runnerId] = Number(positions[runnerId].toFixed(2));
    }
};

const requiredExposure = (positions) => {
    if (!positions || typeof positions !== "object" || Array.isArray(positions)) throw serviceError("Invalid positions");
    const values = Object.values(positions);
    if (values.some((value) => typeof value !== "number" || !Number.isFinite(value))) throw serviceError("Positions contain invalid values");
    return Number(Math.max(0, ...values.map((value) => -value)).toFixed(2));
};

/** Returns the authenticated user's bets for one match, newest first. */
const getUserMatchBets = async (userId, matchId) => {
    if (!matchId) throw new Error("matchId is required");

    return Bet.find({
        userId,
        matchId,
        status: { $in: [BET_STATUS.PENDING, BET_STATUS.WON, BET_STATUS.LOST] },
    })
        .sort({ createdAt: -1 })
        .lean();
};

/** Returns only this Super Admin's downline bets, scaled to their retained share. */
const getAllMatchBets = async (superAdminId, matchId) => {
    if (!matchId) throw new Error("matchId is required");
    const companies = await User.find({ role: ROLES.SUB_COMPANY, createdBy: superAdminId })
        .select("_id allocatedShareBps allocatedShare downlineShare").lean();
    const companyIds = companies.map((company) => company._id);
    const ownedUserIds = await User.find({
        role: ROLES.USER,
        $or: [
            { createdBy: superAdminId }, { parentId: superAdminId },
            { createdBy: { $in: companyIds } }, { parentId: { $in: companyIds } },
        ],
    }).distinct("_id");
    const companyShareById = new Map(companies.map((company) => [
        String(company._id), getCompanyShareBps(company),
    ]));
    const [bets, runners, sessions] = await Promise.all([
        Bet.find({
            matchId,
            status: { $ne: BET_STATUS.CANCELLED },
            $or: [
                { rootSuperAdminId: superAdminId },
                { rootSuperAdminId: null, userId: { $in: ownedUserIds } },
            ],
        })
            .populate("userId", "username firstName role parentId createdBy")
            .sort({ createdAt: -1 }).lean(),
        ManualRunner.find({ matchId }).select("runnerId runnerName").lean(),
        Session.find({ matchId }).select("id sessionName").lean(),
    ]);
    const runnerNames = new Map(runners.map((runner) => [runner.runnerId, runner.runnerName]));
    const sessionNames = new Map(sessions.map((session) => [session.id, session.sessionName]));
    return bets.map((bet) => {
        const snapshotShare = getViewerShareBps(bet, superAdminId);
        let sharedBet;
        if (snapshotShare !== undefined) {
            sharedBet = scaleBetForViewer({
                ...bet,
                selectionName: bet.marketType === "session"
                    ? sessionNames.get(bet.marketId) || bet.marketId
                    : runnerNames.get(bet.marketId) || bet.marketId,
            }, superAdminId);
        } else {
            const parentId = bet.userId?.parentId || bet.userId?.createdBy;
            const currentCompanyShare = companyShareById.get(String(parentId));
            const allocatedShareBps = currentCompanyShare == null ? 0 : currentCompanyShare;
            sharedBet = scaleBetForRemainder({
                ...bet,
                selectionName: bet.marketType === "session"
                    ? sessionNames.get(bet.marketId) || bet.marketId
                    : runnerNames.get(bet.marketId) || bet.marketId,
            }, allocatedShareBps);
        }

        // Super Admin's bet list must show the user's real face-value bet.
        // Keep the Super Admin share alongside it for accounting/reporting.
        return {
            ...bet,
            selectionName: sharedBet.selectionName,
            visibleShareBps: sharedBet.visibleShareBps,
            visibleSharePercent: sharedBet.visibleSharePercent,
            shareAmount: sharedBet.amount,
            shareProfit: sharedBet.profit,
            shareLoss: sharedBet.loss,
        };
    });
};

const settleBet = async (betId, won, settledBy) => {
    if (!mongoose.Types.ObjectId.isValid(betId)) throw serviceError("Invalid betId", 400, "INVALID_BET_ID");
    if (!mongoose.Types.ObjectId.isValid(settledBy)) throw serviceError("Invalid settledBy", 400, "INVALID_SETTLER");
    if (typeof won !== "boolean") throw serviceError("won must be a boolean", 400, "INVALID_SETTLEMENT_RESULT");
    const dbSession = await mongoose.startSession();
    let settledBet;
    try {
        await dbSession.withTransaction(async () => {
            const [existing, actor] = await Promise.all([
                Bet.findById(betId).session(dbSession).lean(),
                User.findById(settledBy).session(dbSession).lean(),
            ]);
            if (!existing) throw serviceError("Bet not found", 404, "BET_NOT_FOUND");
            if (!actor || ![ROLES.SUPPORT, ROLES.SUPERADMIN].includes(actor.role)) throw serviceError("Settlement is not authorized", 403, "SETTLEMENT_FORBIDDEN");
            if (actor.role === ROLES.SUPERADMIN && String(existing.rootSuperAdminId || "") !== String(actor._id)) throw serviceError("Bet belongs to another tenant", 403, "CROSS_TENANT_FORBIDDEN");
            if (existing.marketType !== "session") throw serviceError("Match bets must be settled at match level", 409, "MATCH_LEVEL_SETTLEMENT_REQUIRED");
            if (existing.status !== BET_STATUS.PENDING) throw serviceError("Bet has already been settled", 409, "BET_ALREADY_SETTLED");
            settledBet = await Bet.findOneAndUpdate(
                { _id: betId, status: BET_STATUS.PENDING },
                { $set: { status: won ? BET_STATUS.WON : BET_STATUS.LOST, settledAt: new Date(), settledBy } },
                { new: true, session: dbSession }
            );
            if (!settledBet) throw serviceError("Bet has already been settled", 409, "BET_ALREADY_SETTLED");
            if (won) {
                const creditAmount = Number((existing.profit + existing.loss).toFixed(2));
                const user = await User.findById(existing.userId).session(dbSession);
                if (!user) throw serviceError("Bet user not found", 404, "USER_NOT_FOUND");
                const balanceBefore = Number(user.coins);
                const balanceAfter = Number((balanceBefore + creditAmount).toFixed(2));
                if (!Number.isFinite(balanceAfter)) throw serviceError("Invalid wallet result", 409, "INVALID_WALLET");
                await Ledger.create([{ userId: existing.userId, amount: creditAmount, type: "credit", reason: `${existing.type.toUpperCase()} session bet won on match ${existing.matchId}`, createdBy: settledBy, balanceBefore, balanceAfter,
                    transactionCode: "SESSION_BET_WIN_PAID", referenceType: "bet", referenceId: String(existing._id),
                    correlationId: existing.correlationId || `bet:${existing._id}`, matchId: existing.matchId,
                    marketType: existing.marketType, marketId: existing.marketId,
                }], { session: dbSession });
                user.coins = balanceAfter;
                await user.save({ session: dbSession });
            }
        });
    } catch (error) {
        if (error?.code === 11000 && error?.keyPattern?.clientBetId) throw serviceError("Duplicate bet request", 409, "DUPLICATE_BET");
        throw error;
    } finally {
        await dbSession.endSession();
    }
    return settledBet;
};

const settleMatchBets = async ({ matchId, winningRunnerId, settledBy }) => {
    matchId = requireNonEmptyString(matchId, "matchId");
    winningRunnerId = requireNonEmptyString(winningRunnerId, "winningRunnerId");
    if (!mongoose.Types.ObjectId.isValid(settledBy)) throw serviceError("Invalid settledBy", 400, "INVALID_SETTLER");
    const dbSession = await mongoose.startSession();
    let result;
    const correlationId = `match-settlement:${matchId}:${new mongoose.Types.ObjectId()}`;
    try {
        await dbSession.withTransaction(async () => {
            const actor = await User.findById(settledBy).session(dbSession).lean();
            if (!actor || ![ROLES.SUPPORT, ROLES.SUPERADMIN].includes(actor.role)) throw serviceError("Settlement is not authorized", 403, "SETTLEMENT_FORBIDDEN");
            const runner = await ManualRunner.findOne({ matchId, runnerId: winningRunnerId }).session(dbSession).lean();
            if (!runner) throw serviceError("Winning runner does not belong to this match", 400, "INVALID_WINNING_RUNNER");
            const savedMatch = await SavedMatch.findOne(actor.role === ROLES.SUPERADMIN
                ? { matchId, user: actor._id }
                : { matchId }).session(dbSession);
            if (savedMatch?.isDeclared) throw serviceError("Match has already been settled", 409, "MATCH_ALREADY_SETTLED");
            const betFilter = { matchId, marketType: "match", status: BET_STATUS.PENDING };
            if (actor.role === ROLES.SUPERADMIN) betFilter.rootSuperAdminId = actor._id;
            const bets = await Bet.find(betFilter).session(dbSession).lean();
            if (!bets.length && !savedMatch) throw serviceError("Saved match not found and there are no pending match bets", 404, "MATCH_NOT_FOUND");
            const existingUsers = bets.length
                ? await User.find({ _id: { $in: [...new Set(bets.map((bet) => String(bet.userId)))] } })
                    .session(dbSession)
                    .select("_id")
                    .lean()
                : [];
            const existingUserIds = new Set(existingUsers.map((user) => String(user._id)));
            const orphanBets = bets.filter((bet) => !existingUserIds.has(String(bet.userId)));
            const validBets = bets.filter((bet) => existingUserIds.has(String(bet.userId)));
            const byUser = new Map();
            for (const bet of validBets) {
                const key = String(bet.userId);
                if (!byUser.has(key)) byUser.set(key, []);
                byUser.get(key).push(bet);
            }
            const wallets = [];
            for (const [userId, userBets] of byUser) {
                const reserved = Number(userBets.reduce((sum, bet) => sum + Number(bet.walletAdjustment == null ? bet.loss : bet.walletAdjustment), 0).toFixed(2));
                const netPnl = Number(userBets.reduce((sum, bet) => {
                    const selectedWon = bet.marketId === winningRunnerId;
                    const won = bet.type === BET_TYPE.YES ? selectedWon : !selectedWon;
                    return sum + (won ? Number(bet.profit) : -Number(bet.loss));
                }, 0).toFixed(2));
                const adjustment = Number((reserved + netPnl).toFixed(2));
                const user = await User.findById(userId).session(dbSession);
                if (!user) throw serviceError("Bet user disappeared during settlement", 409, "CONCURRENT_USER_REMOVAL");
                const balanceBefore = Number(user.coins);
                const balanceAfter = Number((balanceBefore + adjustment).toFixed(2));
                if (!Number.isFinite(balanceAfter) || balanceAfter < 0) throw serviceError("Settlement would create an invalid wallet balance", 409, "INVALID_WALLET");
                if (adjustment !== 0) {
                    await Ledger.create([{ userId, amount: Math.abs(adjustment), type: adjustment > 0 ? "credit" : "debit", reason: `Match ${matchId} settled; winner ${winningRunnerId}`, createdBy: settledBy, balanceBefore, balanceAfter,
                        transactionCode: adjustment > 0 ? "MATCH_SETTLEMENT_CREDIT" : "MATCH_SETTLEMENT_DEBIT",
                        referenceType: "match", referenceId: matchId, correlationId, matchId,
                        marketType: "match", marketId: winningRunnerId,
                    }], { session: dbSession });
                    user.coins = balanceAfter;
                    await user.save({ session: dbSession });
                }
                wallets.push({ userId, reserved, netPnl, adjustment, balanceBefore, balanceAfter });
            }
            const now = new Date();
            const profitLoss = Number(validBets.reduce((total, bet) => {
                const selectedWon = bet.marketId === winningRunnerId;
                const won = bet.type === BET_TYPE.YES ? selectedWon : !selectedWon;
                return total + (won ? -Number(bet.profit) : Number(bet.loss));
            }, 0).toFixed(2));
            for (const bet of validBets) {
                const selectedWon = bet.marketId === winningRunnerId;
                const won = bet.type === BET_TYPE.YES ? selectedWon : !selectedWon;
                const update = await Bet.updateOne({ _id: bet._id, status: BET_STATUS.PENDING }, { $set: { status: won ? BET_STATUS.WON : BET_STATUS.LOST, settledAt: now, settledBy, settlementId: correlationId } }, { session: dbSession });
                if (update.modifiedCount !== 1) throw serviceError("Concurrent match settlement detected", 409, "MATCH_ALREADY_SETTLED");
            }
            for (const bet of orphanBets) {
                const update = await Bet.updateOne(
                    { _id: bet._id, status: BET_STATUS.PENDING },
                    { $set: { status: BET_STATUS.CANCELLED, settledAt: now, settledBy, settlementId: correlationId } },
                    { session: dbSession }
                );
                if (update.modifiedCount !== 1) throw serviceError("Concurrent orphan bet update detected", 409, "MATCH_ALREADY_SETTLED");
            }
            if (savedMatch) {
                savedMatch.isDeclared = true;
                savedMatch.winningRunnerId = winningRunnerId;
                savedMatch.wonBy = runner.runnerName;
                savedMatch.profitLoss = profitLoss;
                savedMatch.settledAt = now;
                savedMatch.settledBy = settledBy;
                savedMatch.settlementId = correlationId;
                await savedMatch.save({ session: dbSession, validateModifiedOnly: true });
            }
            result = { matchId, winningRunnerId, winningRunnerName: runner.runnerName, settledCount: validBets.length, orphanCancelledCount: orphanBets.length, profitLoss, wallets };
        });
    } finally {
        await dbSession.endSession();
    }
    return result;
};

const reverseMatchSettlement = async ({ matchId, reversedBy }) => {
    matchId = requireNonEmptyString(matchId, "matchId");
    if (!mongoose.Types.ObjectId.isValid(reversedBy)) throw serviceError("Invalid reversedBy", 400, "INVALID_SETTLER");
    const dbSession = await mongoose.startSession();
    let result;
    try {
        await dbSession.withTransaction(async () => {
            const actor = await User.findById(reversedBy).session(dbSession).lean();
            if (!actor || actor.role !== ROLES.SUPERADMIN) throw serviceError("Only Super Admin can reverse a match settlement", 403, "REVERSAL_FORBIDDEN");
            const savedMatch = await SavedMatch.findOne({ matchId, user: actor._id }).session(dbSession);
            if (!savedMatch) throw serviceError("Saved match not found", 404, "MATCH_NOT_FOUND");
            if (!savedMatch.isDeclared) throw serviceError("Match is not settled", 409, "MATCH_NOT_SETTLED");

            const settlementFilter = savedMatch.settlementId
                ? { settlementId: savedMatch.settlementId }
                : { settledAt: savedMatch.settledAt };
            const bets = await Bet.find({
                matchId,
                marketType: "match",
                status: { $in: [BET_STATUS.WON, BET_STATUS.LOST, BET_STATUS.CANCELLED] },
                ...settlementFilter,
            }).session(dbSession).lean();
            const validBets = bets.filter((bet) => bet.status === BET_STATUS.WON || bet.status === BET_STATUS.LOST);
            const byUser = new Map();
            for (const bet of validBets) {
                const key = String(bet.userId);
                if (!byUser.has(key)) byUser.set(key, []);
                byUser.get(key).push(bet);
            }
            const reversalId = `match-reversal:${matchId}:${new mongoose.Types.ObjectId()}`;
            const wallets = [];
            for (const [userId, userBets] of byUser) {
                const settlementAdjustment = Number(userBets.reduce((sum, bet) => {
                    const reserved = Number(bet.walletAdjustment == null ? bet.loss : bet.walletAdjustment);
                    const netPnl = bet.status === BET_STATUS.WON ? Number(bet.profit) : -Number(bet.loss);
                    return sum + reserved + netPnl;
                }, 0).toFixed(2));
                const reversalAdjustment = Number((-settlementAdjustment).toFixed(2));
                const user = await User.findById(userId).session(dbSession);
                if (!user) throw serviceError("Bet user not found; settlement cannot be reversed", 409, "REVERSAL_USER_NOT_FOUND");
                const balanceBefore = Number(user.coins);
                const balanceAfter = Number((balanceBefore + reversalAdjustment).toFixed(2));
                if (!Number.isFinite(balanceAfter) || balanceAfter < 0) throw serviceError("User balance is insufficient to reverse this settlement", 409, "REVERSAL_INSUFFICIENT_BALANCE");
                if (reversalAdjustment !== 0) {
                    await Ledger.create([{
                        userId,
                        amount: Math.abs(reversalAdjustment),
                        type: reversalAdjustment > 0 ? "credit" : "debit",
                        reason: `Match ${matchId} settlement reversed`,
                        createdBy: reversedBy,
                        balanceBefore,
                        balanceAfter,
                        transactionCode: reversalAdjustment > 0 ? "MATCH_REVERSAL_CREDIT" : "MATCH_REVERSAL_DEBIT",
                        referenceType: "match",
                        referenceId: matchId,
                        correlationId: reversalId,
                        matchId,
                        marketType: "match",
                        marketId: savedMatch.winningRunnerId,
                    }], { session: dbSession });
                    user.coins = balanceAfter;
                    await user.save({ session: dbSession });
                }
                wallets.push({ userId, settlementAdjustment, reversalAdjustment, balanceBefore, balanceAfter });
            }

            const betIds = bets.map((bet) => bet._id);
            if (betIds.length) {
                const update = await Bet.updateMany(
                    { _id: { $in: betIds }, ...settlementFilter },
                    { $set: { status: BET_STATUS.PENDING }, $unset: { settledAt: 1, settledBy: 1, settlementId: 1 } },
                    { session: dbSession }
                );
                if (update.modifiedCount !== betIds.length) throw serviceError("Concurrent match reversal detected", 409, "MATCH_REVERSAL_CONFLICT");
            }

            const previousWinner = savedMatch.wonBy;
            const previousProfitLoss = Number(savedMatch.profitLoss || 0);
            savedMatch.isDeclared = false;
            savedMatch.winningRunnerId = "";
            savedMatch.wonBy = "";
            savedMatch.profitLoss = 0;
            savedMatch.settledAt = undefined;
            savedMatch.settledBy = undefined;
            savedMatch.settlementId = "";
            await savedMatch.save({ session: dbSession, validateModifiedOnly: true });
            result = { matchId, reversedCount: bets.length, previousWinner, previousProfitLoss, wallets };
        });
    } finally {
        await dbSession.endSession();
    }
    return result;
};

/** Returns this Sub Company's users' bets, scaled to its allocated share. */
const getCompanyMatchBets = async (companyId, matchId) => {
    if (!matchId) throw new Error("matchId is required");
    const [company, userIds] = await Promise.all([
        User.findOne({ _id: companyId, role: ROLES.SUB_COMPANY }).select("allocatedShareBps allocatedShare downlineShare").lean(),
        User.find({ role: ROLES.USER, $or: [{ createdBy: companyId }, { parentId: companyId }] }).distinct("_id"),
    ]);
    if (!company) throw new Error("Sub Company not found");
    const [bets, runners, sessions] = await Promise.all([
        Bet.find({
            matchId,
            $or: [
                { ownerPath: companyId },
                { ownerPath: { $size: 0 }, userId: { $in: userIds } },
            ],
        })
            .populate("userId", "username firstName role")
            .sort({ createdAt: -1 }).lean(),
        ManualRunner.find({ matchId }).select("runnerId runnerName").lean(),
        Session.find({ matchId }).select("id sessionName").lean(),
    ]);
    const runnerNames = new Map(runners.map((runner) => [runner.runnerId, runner.runnerName]));
    const sessionNames = new Map(sessions.map((session) => [session.id, session.sessionName]));
    return bets.map((bet) => {
        const decoratedBet = {
            ...bet,
            selectionName: bet.marketType === "session"
                ? sessionNames.get(bet.marketId) || bet.marketId
                : runnerNames.get(bet.marketId) || bet.marketId,
        };
        const snapshotShare = getViewerShareBps(bet, companyId);
        return snapshotShare === undefined
            ? scaleBetForShare(decoratedBet, getCompanyShareBps(company))
            : scaleBetForViewer(decoratedBet, companyId);
    });
};

const getCompanyMatchSummaries = async (companyId) => {
    const company = await User.findOne({ _id: companyId, role: ROLES.SUB_COMPANY })
        .select("allocatedShareBps allocatedShare downlineShare rootSuperAdminId parentId createdBy").lean();
    if (!company) throw serviceError("Sub Company not found", 404, "SUB_COMPANY_NOT_FOUND");
    const ownerId = company.rootSuperAdminId || company.parentId || company.createdBy;
    if (!ownerId) throw serviceError("Sub Company owner is unavailable", 409, "COMPANY_OWNER_NOT_FOUND");
    const [matches, userIds] = await Promise.all([
        SavedMatch.find({ user: ownerId }).sort({ createdAt: -1 }).lean(),
        User.find({ role: ROLES.USER, $or: [{ createdBy: companyId }, { parentId: companyId }] }).distinct("_id"),
    ]);
    if (!matches.length) return [];
    const bets = await Bet.find({
        matchId: { $in: matches.map((match) => match.matchId) },
        status: { $in: [BET_STATUS.WON, BET_STATUS.LOST] },
        $or: [{ ownerPath: company._id }, { ownerPath: { $size: 0 }, userId: { $in: userIds } }],
    }).lean();
    const fallbackShareBps = getCompanyShareBps(company);
    const pnlByMatch = new Map();
    for (const bet of bets) {
        const shareBps = getViewerShareBps(bet, companyId) ?? fallbackShareBps;
        const fullPnl = bet.status === BET_STATUS.WON ? -Number(bet.profit) : Number(bet.loss);
        const visiblePnl = Number((fullPnl * shareBps / 10000).toFixed(2));
        pnlByMatch.set(bet.matchId, Number(((pnlByMatch.get(bet.matchId) || 0) + visiblePnl).toFixed(2)));
    }
    return matches.map((match) => ({
        ...match,
        profitLoss: match.isDeclared ? (pnlByMatch.get(match.matchId) || 0) : null,
    }));
};

/** Deletes a bet and safely releases any pending wallet exposure. */
const unsafeDeleteBetSlipLegacy = async (betId, deletedBy) => {
    const dbSession = await mongoose.startSession();
    let deletedBet;
    let balance;

    try {
        await dbSession.withTransaction(async () => {
            const bet = await Bet.findById(betId).session(dbSession);
            if (!bet) {
                const error = new Error("Bet slip not found");
                error.statusCode = 404;
                throw error;
            }

            deletedBet = bet.toObject();
            if (bet.status !== BET_STATUS.PENDING) {
                await bet.deleteOne({ session: dbSession });
                return;
            }

            const user = await User.findById(bet.userId).session(dbSession);
            if (!user) throw new Error("Bet user not found");

            let walletRelease;
            if (bet.marketType === "session") {
                walletRelease = Number(
                    bet.walletAdjustment == null ? bet.loss : bet.walletAdjustment
                );
            } else {
                const [runnerDocs, pendingBets] = await Promise.all([
                    ManualRunner.find({ matchId: bet.matchId })
                        .select("runnerId")
                        .session(dbSession)
                        .lean(),
                    Bet.find({
                        userId: bet.userId,
                        matchId: bet.matchId,
                        marketType: "match",
                        status: BET_STATUS.PENDING,
                    })
                        .session(dbSession)
                        .lean(),
                ]);

                const runnerIds = runnerDocs.map((runner) => runner.runnerId);
                const currentlyReserved = Number(
                    pendingBets.reduce((total, pendingBet) => {
                        const movement = pendingBet.walletAdjustment == null
                            ? Number(pendingBet.loss)
                            : Number(pendingBet.walletAdjustment);
                        return total + movement;
                    }, 0).toFixed(2)
                );
                const positions = Object.fromEntries(runnerIds.map((runnerId) => [runnerId, 0]));
                pendingBets
                    .filter((pendingBet) => String(pendingBet._id) !== String(bet._id))
                    .forEach((pendingBet) => addBetToPositions(positions, runnerIds, pendingBet));
                walletRelease = Number((currentlyReserved - requiredExposure(positions)).toFixed(2));
            }

            const balanceBefore = Number(user.coins);
            const balanceAfter = Number((balanceBefore + walletRelease).toFixed(2));
            if (balanceAfter < 0) {
                const error = new Error("Insufficient wallet balance to remove this hedging bet");
                error.statusCode = 409;
                throw error;
            }

            if (walletRelease !== 0) {
                await Ledger.create([{
                    userId: bet.userId,
                    amount: Math.abs(walletRelease),
                    type: walletRelease > 0 ? "credit" : "debit",
                    reason: walletRelease > 0
                        ? `Pending ${bet.marketType} bet deleted; exposure released`
                        : "Pending hedge bet deleted; exposure increased",
                    createdBy: deletedBy,
                    balanceBefore,
                    balanceAfter,
                }], { session: dbSession });
                user.coins = balanceAfter;
                await user.save({ session: dbSession });
            }

            balance = balanceAfter;
            await bet.deleteOne({ session: dbSession });
        });
    } finally {
        await dbSession.endSession();
    }

    return { bet: deletedBet, balance };
};

const deleteBetSlip = async (betId, deletedBy) => {
    if (!mongoose.Types.ObjectId.isValid(betId)) throw serviceError("Invalid betId", 400, "INVALID_BET_ID");
    if (!mongoose.Types.ObjectId.isValid(deletedBy)) throw serviceError("Invalid deletedBy", 400, "INVALID_DELETER");
    const dbSession = await mongoose.startSession();
    let cancelledBet;
    let balance;
    try {
        await dbSession.withTransaction(async () => {
            const [bet, actor] = await Promise.all([
                Bet.findById(betId).session(dbSession),
                User.findById(deletedBy).session(dbSession).lean(),
            ]);
            if (!bet) throw serviceError("Bet slip not found", 404, "BET_NOT_FOUND");
            if (!actor || actor.role !== ROLES.SUPERADMIN) throw serviceError("Not authorized to delete this bet", 403, "DELETE_FORBIDDEN");
            const ownsBet = String(bet.rootSuperAdminId || "") === String(actor._id) ||
                (Array.isArray(bet.ownerPath) && bet.ownerPath.some((id) => String(id) === String(actor._id)));
            if (!ownsBet) throw serviceError("Bet belongs to another tenant", 403, "CROSS_TENANT_FORBIDDEN");
            if (bet.status !== BET_STATUS.PENDING) throw serviceError("Only pending bets can be cancelled", 409, "BET_NOT_PENDING");
            const user = await User.findById(bet.userId).session(dbSession);
            if (!user) throw serviceError("Bet user not found", 404, "USER_NOT_FOUND");
            let walletRelease;
            if (bet.marketType === "session") {
                walletRelease = Number(bet.walletAdjustment == null ? bet.loss : bet.walletAdjustment);
            } else {
                const [runnerDocs, pendingBets] = await Promise.all([
                    ManualRunner.find({ matchId: bet.matchId }).select("runnerId").session(dbSession).lean(),
                    Bet.find({ userId: bet.userId, matchId: bet.matchId, marketType: "match", status: BET_STATUS.PENDING }).session(dbSession).lean(),
                ]);
                const runnerIds = runnerDocs.map((runner) => runner.runnerId);
                const currentlyReserved = Number(pendingBets.reduce((sum, item) => sum + Number(item.walletAdjustment == null ? item.loss : item.walletAdjustment), 0).toFixed(2));
                const positions = Object.fromEntries(runnerIds.map((runnerId) => [runnerId, 0]));
                pendingBets.filter((item) => String(item._id) !== String(bet._id)).forEach((item) => addBetToPositions(positions, runnerIds, item));
                walletRelease = Number((currentlyReserved - requiredExposure(positions)).toFixed(2));
            }
            const balanceBefore = Number(user.coins);
            const balanceAfter = Number((balanceBefore + walletRelease).toFixed(2));
            if (!Number.isFinite(balanceAfter) || balanceAfter < 0) throw serviceError("Insufficient wallet balance to remove this hedging bet", 409, "INSUFFICIENT_BALANCE");
            cancelledBet = await Bet.findOneAndUpdate({ _id: bet._id, status: BET_STATUS.PENDING }, { $set: { status: BET_STATUS.CANCELLED, settledAt: new Date(), settledBy: deletedBy } }, { new: true, session: dbSession });
            if (!cancelledBet) throw serviceError("Bet is no longer pending", 409, "BET_NOT_PENDING");
            if (walletRelease !== 0) {
                await Ledger.create([{ userId: bet.userId, amount: Math.abs(walletRelease), type: walletRelease > 0 ? "credit" : "debit", reason: walletRelease > 0 ? `Pending ${bet.marketType} bet cancelled; exposure released` : "Pending hedge bet cancelled; exposure increased", createdBy: deletedBy, balanceBefore, balanceAfter,
                    transactionCode: walletRelease > 0 ? "BET_CANCELLATION_EXPOSURE_RELEASED" : "BET_CANCELLATION_EXPOSURE_INCREASED",
                    referenceType: "bet", referenceId: String(bet._id), correlationId: bet.correlationId || `bet:${bet._id}`,
                    matchId: bet.matchId, marketType: bet.marketType, marketId: bet.marketId,
                }], { session: dbSession });
                user.coins = balanceAfter;
                await user.save({ session: dbSession });
            }
            balance = balanceAfter;
        });
    } finally {
        await dbSession.endSession();
    }
    return { bet: cancelledBet.toObject(), balance };
};

module.exports = {
    placeBet,
    settleBet,
    settleMatchBets,
    reverseMatchSettlement,
    getUserMatchBets,
    getAllMatchBets,
    getCompanyMatchBets,
    getCompanyMatchSummaries,
    deleteBetSlip,
    acceptCurrentMarketRate,
    waitForBetDelay,
    calculateBetFinancials,
    calculateSessionFinancials,
    addBetToPositions,
    requiredExposure,
    normalizeRate,
};
