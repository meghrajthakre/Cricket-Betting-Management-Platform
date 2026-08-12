"use strict";

const { updateUserCoins } = require("./ledger.service");
const { z } = require("zod");
const mongoose = require("mongoose");
const { getSettlementLedger } = require("./settlement-ledger.service");

// Validation schemas
const walletTransactionSchema = z.object({
    userId: z
        .string({ required_error: "userId is required" })
        .refine((val) => mongoose.Types.ObjectId.isValid(val), {
            message: "Invalid userId format",
        }),
    amount: z
        .number({ required_error: "amount is required", invalid_type_error: "amount must be a number" })
        .positive("amount must be greater than 0")
        .finite("amount must be a finite number")
        .multipleOf(0.01, "amount supports up to 2 decimal places"),
    reason: z
        .string({ required_error: "reason is required" })
        .trim()
        .min(3, "reason must be at least 3 characters")
        .max(200, "reason cannot exceed 200 characters"),
});

/**
 * Credit coins to user wallet
 */
const creditCoins = async (req, res) => {
    try {
        const validatedData = walletTransactionSchema.parse(req.body);
        const { userId, amount, reason } = validatedData;

        const result = await updateUserCoins(userId, amount, "credit", reason, req.user._id);

        res.status(200).json({
            success: true,
            message: "Coins credited successfully",
            data: {
                balanceBefore: result.balanceBefore,
                balanceAfter: result.balanceAfter,
            },
        });
    } catch (error) {
        console.error("Credit coins error:", error.message);
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
};

/**
 * Debit coins from user wallet
 */
const debitCoins = async (req, res) => {
    try {
        const validatedData = walletTransactionSchema.parse(req.body);
        const { userId, amount, reason } = validatedData;

        const result = await updateUserCoins(userId, amount, "debit", reason, req.user._id);

        res.status(200).json({
            success: true,
            message: "Coins debited successfully",
            data: {
                balanceBefore: result.balanceBefore,
                balanceAfter: result.balanceAfter,
            },
        });
    } catch (error) {
        console.error("Debit coins error:", error.message);
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
};

const settlementLedger = async (req, res) => {
    try {
        const data = await getSettlementLedger(req.user._id);
        return res.status(200).json({ success: true, data });
    } catch (error) {
        return res.status(error.statusCode || 400).json({ success: false, error: error.message, ...(error.code ? { code: error.code } : {}) });
    }
};

module.exports = { creditCoins, debitCoins, settlementLedger };
