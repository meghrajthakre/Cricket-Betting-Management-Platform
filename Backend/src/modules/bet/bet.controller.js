"use strict";

const { placeBet, settleBet, getUserMatchBets, getAllMatchBets, getCompanyMatchBets, deleteBetSlip } = require("./bet.service");
const { z } = require("zod");
const mongoose = require("mongoose");
const sse = require("../manual/manual.events");

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const placeBetSchema = z.object({
    userId: z
        .string({ required_error: "userId is required" })
        .refine((val) => mongoose.Types.ObjectId.isValid(val), {
            message: "Invalid userId format",
        })
        .optional(),
    matchId: z.string({ required_error: "matchId is required" }).min(1, "matchId cannot be empty"),
    amount: z
        .number({
            required_error: "amount is required",
            invalid_type_error: "amount must be a number",
        })
        .positive("amount must be greater than 0")
        .finite("amount must be a finite number")
        .multipleOf(0.01, "amount supports up to 2 decimal places"),
    /**
     * Indian percentage rate — replaces the old `odds` field.
     * Minimum 1 (i.e. 1%) with no practical upper bound enforced here,
     * but must be finite and positive.
     */
    rate: z
        .number({
            required_error: "rate is required",
            invalid_type_error: "rate must be a number",
        })
        .min(1, "rate must be at least 1")
        .finite("rate must be a finite number"),
    /**
     * "yes" → Lagai (back the outcome)
     * "no"  → Khai  (lay the outcome)
     */
    type: z.enum(["yes", "no"], {
        required_error: "type is required",
        invalid_type_error: 'type must be either "yes" or "no"',
    }),
    marketType: z.enum(["match", "session"]).default("match"),
    marketId: z.string().trim().optional().default(""),
    sessionRate: z.number().positive().finite().optional(),
});

const settleBetSchema = z.object({
    betId: z
        .string({ required_error: "betId is required" })
        .refine((val) => mongoose.Types.ObjectId.isValid(val), {
            message: "Invalid betId format",
        }),
    won: z.boolean({ required_error: "won is required" }),
    settledBy: z
        .string({ required_error: "settledBy is required" })
        .refine((val) => mongoose.Types.ObjectId.isValid(val), {
            message: "Invalid settledBy format",
        }),
});

// ---------------------------------------------------------------------------
// Controllers
// ---------------------------------------------------------------------------

/**
 * POST /bet/place
 * Places a new khai/lagai bet for a user.
 */
const placeBetController = async (req, res) => {
    try {
        const parsed = placeBetSchema.parse(req.body);
        const userId = req.user?._id?.toString() || parsed.userId;
        if (!userId) throw new Error("Authenticated user is required");

        const { bet, balance } = await placeBet(
            userId,
            parsed.matchId,
            parsed.amount,
            parsed.rate,
            parsed.type,
            parsed.marketType,
            parsed.marketId,
            parsed.sessionRate
        );
        if (bet.marketType === "session") {
            sse.broadcast(bet.matchId, {
                type: "SESSION_BET_PLACED",
                payload: {
                    matchId: bet.matchId,
                    sessionId: bet.marketId,
                },
            });
        }

        return res.status(201).json({
            success: true,
            message: "Bet placed successfully",
            data: bet,
            balance,
        });
    } catch (error) {
        console.error("[placeBetController] Error:", error.message);
        return res.status(error.statusCode || 400).json({
            success: false,
            error: error.message,
            ...(error.code ? { code: error.code } : {}),
            ...(error.currentRate !== undefined ? { currentRate: error.currentRate } : {}),
        });
    }
};

/**
 * POST /bet/settle
 * Settles an existing pending bet.
 */
const settleBetController = async (req, res) => {
    try {
        const parsed = settleBetSchema.partial({ settledBy: true }).parse(req.body);
        const settledBy = req.user?._id?.toString() || parsed.settledBy;
        if (!settledBy) throw new Error("Authenticated settler is required");

        const bet = await settleBet(parsed.betId, parsed.won, settledBy);

        return res.status(200).json({
            success: true,
            message: "Bet settled successfully",
            data: bet,
        });
    } catch (error) {
        console.error("[settleBetController] Error:", error.message);
        return res.status(400).json({
            success: false,
            error: error.message,
        });
    }
};

/** GET /bet/mine?matchId=... */
const getMyBetsController = async (req, res) => {
    try {
        const matchId = z.string().min(1, "matchId is required").parse(req.query.matchId);
        const bets = await getUserMatchBets(req.user._id, matchId);

        return res.status(200).json({ success: true, data: bets });
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message });
    }
};

/** GET /bet/match?matchId=... — superadmin sees all users' bets. */
const getAllMatchBetsController = async (req, res) => {
    try {
        const matchId = z.string().min(1, "matchId is required").parse(req.query.matchId);
        const bets = await getAllMatchBets(matchId);

        return res.status(200).json({ success: true, count: bets.length, data: bets });
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message });
    }
};

const getCompanyMatchBetsController = async (req, res) => {
    try {
        const matchId = z.string().min(1, "matchId is required").parse(req.query.matchId);
        const bets = await getCompanyMatchBets(req.user._id, matchId);
        return res.status(200).json({ success: true, count: bets.length, data: bets });
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message });
    }
};

/** DELETE /bet/:betId — superadmin can remove resolved slip records. */
const deleteBetController = async (req, res) => {
    try {
        const betId = z
            .string()
            .refine((value) => mongoose.Types.ObjectId.isValid(value), "Invalid betId format")
            .parse(req.params.betId);
        const result = await deleteBetSlip(betId, req.user._id);
        sse.broadcast(result.bet.matchId, {
            type: "BET_DELETED",
            payload: {
                matchId: result.bet.matchId,
                betId: result.bet._id,
                userId: result.bet.userId,
            },
        });
        return res.status(200).json({
            success: true,
            message: "Bet slip deleted successfully",
            data: result.bet,
            balance: result.balance,
        });
    } catch (error) {
        return res.status(error.statusCode || 400).json({ success: false, error: error.message });
    }
};

module.exports = {
    placeBetController,
    settleBetController,
    getMyBetsController,
    getAllMatchBetsController,
    getCompanyMatchBetsController,
    deleteBetController,
};
