"use strict";

const mongoose = require("mongoose");
const { ROLES } = require("../user/user.model");

const BET_STATUS = Object.freeze({
    PENDING: "pending",
    WON: "won",
    LOST: "lost",
    CANCELLED: "cancelled",
});

const BET_TYPE = Object.freeze({
    YES: "yes", // Lagai — backs the outcome
    NO: "no",  // Khai  — lays the outcome
});

const betSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "userId is required"],
            index: true,
        },
        rootSuperAdminId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
        ownerPath: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        shareSnapshot: [{
            _id: false,
            userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
            role: { type: String, enum: Object.values(ROLES), required: true },
            shareBps: { type: Number, min: 0, max: 10000, required: true },
        }],
        matchId: {
            type: String,
            required: [true, "matchId is required"],
        },
        marketType: {
            type: String,
            enum: ["match", "session"],
            default: "match",
            index: true,
        },
        marketId: {
            type: String,
            trim: true,
            default: "",
        },
        /**
         * The face-value stake entered by the user.
         * Only the `liability` portion is actually debited at placement time.
         */
        amount: {
            type: Number,
            required: [true, "amount is required"],
            min: [0.01, "Amount must be greater than 0"],
        },
        /**
         * Indian-style percentage rate (e.g. 90 means 90%).
         * Replaces the old `odds` field.
         */
        rate: {
            type: Number,
            required: [true, "rate is required"],
            min: [1, "Rate must be at least 1"],
        },
        // Session bets keep the selected run line and payout multiplier apart.
        sessionRun: { type: Number, default: undefined },
        sessionRate: { type: Number, default: undefined },
        resultRun: { type: Number, default: undefined },
        /**
         * "yes"  → Lagai (back / favour the outcome)
         * "no"   → Khai  (lay / oppose the outcome)
         */
        type: {
            type: String,
            enum: Object.values(BET_TYPE),
            required: [true, "type is required"],
        },
        /**
         * How much the user gains if the bet wins.
         *   YES → (rate × amount) / 100
         *   NO  → amount
         */
        profit: {
            type: Number,
            required: true,
            min: [0, "Profit cannot be negative"],
        },
        /**
         * How much the user loses (and is debited as liability) when the bet is placed.
         *   YES → amount
         *   NO  → (rate × amount) / 100
         */
        loss: {
            type: Number,
            required: true,
            min: [0, "Loss cannot be negative"],
        },
        // Positive means coins debited; negative means hedge collateral refunded.
        // Missing on legacy bets, where the full `loss` was debited.
        walletAdjustment: {
            type: Number,
            default: undefined,
        },
        clientBetId: {
            type: String,
            trim: true,
            maxlength: 100,
            default: undefined,
        },
        correlationId: {
            type: String,
            trim: true,
            maxlength: 120,
            index: true,
        },
        status: {
            type: String,
            enum: Object.values(BET_STATUS),
            default: BET_STATUS.PENDING,
        },
        settledAt: {
            type: Date,
        },
        settledBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
betSchema.index({ userId: 1, createdAt: -1 });
betSchema.index({ matchId: 1, status: 1 });
betSchema.index({ userId: 1, matchId: 1, marketType: 1, marketId: 1, status: 1 });
betSchema.index({ rootSuperAdminId: 1, matchId: 1, createdAt: -1 });
betSchema.index({ ownerPath: 1, matchId: 1, createdAt: -1 });
betSchema.index(
    { userId: 1, clientBetId: 1 },
    { unique: true, partialFilterExpression: { clientBetId: { $type: "string" } } }
);

const Bet = mongoose.model("Bet", betSchema);

module.exports = { Bet, BET_STATUS, BET_TYPE };
