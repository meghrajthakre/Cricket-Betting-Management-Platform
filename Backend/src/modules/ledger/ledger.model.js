"use strict";

const mongoose = require("mongoose");

const TX_TYPES = Object.freeze({
    CREDIT: "credit",
    DEBIT: "debit",
});

const ledgerSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "userId is required"],
            index: true,
        },

        amount: {
            type: Number,
            required: [true, "amount is required"],
            min: [0.01, "Amount must be greater than 0"],
        },

        type: {
            type: String,
            enum: {
                values: Object.values(TX_TYPES),
                message: "type must be credit or debit",
            },
            required: [true, "type is required"],
        },

        reason: {
            type: String,
            required: [true, "reason is required"],
            trim: true,
            maxlength: [200, "reason cannot exceed 200 characters"],
        },

        // Machine-readable audit linkage. Optional for legacy/manual wallet entries.
        transactionCode: { type: String, trim: true, maxlength: 60, index: true },
        referenceType: { type: String, trim: true, maxlength: 30 },
        referenceId: { type: String, trim: true, maxlength: 120, index: true },
        correlationId: { type: String, trim: true, maxlength: 120, index: true },
        matchId: { type: String, trim: true, maxlength: 120, index: true },
        marketType: { type: String, enum: ["match", "session"] },
        marketId: { type: String, trim: true, maxlength: 120 },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "createdBy is required"],
        },

        /** Snapshot of balances for instant audit without re-summing */
        balanceBefore: { type: Number, required: true },
        balanceAfter: { type: Number, required: true },
    },
    {
        timestamps: true,
        // Ledger entries are immutable — block all updates
        toJSON: {
            transform(_doc, ret) {
                delete ret.__v;
                return ret;
            },
        },
    }
);

ledgerSchema.path("amount").validate(Number.isFinite, "Amount must be finite");
ledgerSchema.path("balanceBefore").validate(Number.isFinite, "balanceBefore must be finite");
ledgerSchema.path("balanceAfter").validate(Number.isFinite, "balanceAfter must be finite");

// ── Indexes ───────────────────────────────────────────────────────────────────
ledgerSchema.index({ userId: 1, createdAt: -1 });
ledgerSchema.index({ createdBy: 1, createdAt: -1 });

// ── Immutability guard ────────────────────────────────────────────────────────
ledgerSchema.pre(["updateOne", "findOneAndUpdate"], function () {
    throw new Error("Ledger entries are immutable");
});

const Ledger = mongoose.model("Ledger", ledgerSchema);

module.exports = { Ledger, TX_TYPES };
