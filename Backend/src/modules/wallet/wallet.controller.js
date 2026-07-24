"use strict";

const {
    getUserBalance,
    getTransactionHistory,
    creditWallet,
    debitWallet,
} = require("./wallet.service");
const { z } = require("zod");
const mongoose = require("mongoose");

// Validation schemas
const userIdSchema = z.object({
    userId: z
        .string({ required_error: "userId is required" })
        .refine((val) => mongoose.Types.ObjectId.isValid(val), {
            message: "Invalid userId format",
        }),
});

const historyQuerySchema = z.object({
    limit: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 10))
        .refine((val) => val > 0 && val <= 100, "limit must be between 1 and 100"),
    skip: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 0))
        .refine((val) => val >= 0, "skip must be non-negative"),
});

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
    reason: z.string().optional().default("Manual adjustment"),
    createdBy: z
        .string()
        .optional()
        .refine((val) => !val || mongoose.Types.ObjectId.isValid(val), {
            message: "Invalid createdBy format",
        }),
});

/**
 * Get user wallet balance
 */
const getBalance = async (req, res) => {
    try {
        const { userId } = userIdSchema.parse(req.params);
        const balance = await getUserBalance(userId);

        res.status(200).json({
            success: true,
            data: { balance },
        });
    } catch (error) {
        console.error("Get balance error:", error.message);
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
};

/**
 * Get user transaction history
 */
const getHistory = async (req, res) => {
    try {
        const { userId } = userIdSchema.parse(req.params);
        const { limit, skip } = historyQuerySchema.parse(req.query);

        const transactions = await getTransactionHistory(userId, limit, skip);

        res.status(200).json({
            success: true,
            data: { transactions },
        });
    } catch (error) {
        console.error("Get history error:", error.message);
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
};

/**
 * Credit coins to wallet
 */
const credit = async (req, res) => {
    try {
        const { userId, amount } = walletTransactionSchema.parse(req.body);

        const result = await creditWallet(userId, amount, req.user._id);

        res.status(200).json({
            success: true,
            message: "Wallet credited successfully",
            data: {
                balanceBefore: result.balanceBefore,
                balanceAfter: result.balanceAfter,
            },
        });
    } catch (error) {
        console.error("Credit wallet error:", error.message);
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
};

/**
 * Debit coins from wallet
 */
const debit = async (req, res) => {
    try {
        const { userId, amount } = walletTransactionSchema.parse(req.body);

        const result = await debitWallet(userId, amount, req.user._id);

        res.status(200).json({
            success: true,
            message: "Wallet debited successfully",
            data: {
                balanceBefore: result.balanceBefore,
                balanceAfter: result.balanceAfter,
            },
        });
    } catch (error) {
        console.error("Debit wallet error:", error.message);
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
};

module.exports = { getBalance, getHistory, credit, debit };
