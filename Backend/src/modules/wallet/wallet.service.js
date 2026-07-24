"use strict";

const {User} = require("../../models/User");
const { Ledger } = require("../ledger/ledger.model");
const { updateUserCoins } = require("../ledger/ledger.service");

/**
 * Get user wallet balance
 * @param {string} userId - User ID
 * @returns {Promise<number>} Current balance
 */
const getUserBalance = async (userId) => {
    const user = await User.findById(userId).select("coins");
    if (!user) {
        throw new Error("User not found");
    }
    return user.coins;
};

/**
 * Get user transaction history
 * @param {string} userId - User ID
 * @param {number} limit - Number of transactions to return
 * @param {number} skip - Number of transactions to skip
 * @returns {Promise<Array>} Transaction history
 */
const getTransactionHistory = async (userId, limit = 10, skip = 0) => {
    const transactions = await Ledger.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .select("-__v");

    return transactions;
};

/**
 * Credit coins to wallet
 * @param {string} userId - User ID
 * @param {number} amount - Amount to credit
 * @returns {Promise<{balanceBefore: number, balanceAfter: number}>}
 */
const creditWallet = async (userId, amount, createdBy) => {
    return await updateUserCoins(userId, amount, "credit", "Manual adjustment", createdBy);
};

/**
 * Debit coins from wallet
 * @param {string} userId - User ID
 * @param {number} amount - Amount to debit
 * @returns {Promise<{balanceBefore: number, balanceAfter: number}>}
 */
const debitWallet = async (userId, amount, createdBy) => {
    return await updateUserCoins(userId, amount, "debit", "Manual adjustment", createdBy);
};

module.exports = {
    getUserBalance,
    getTransactionHistory,
    creditWallet,
    debitWallet,
};
