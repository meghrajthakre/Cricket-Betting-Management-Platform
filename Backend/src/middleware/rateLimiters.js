"use strict";

const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

const jsonHandler = (message) => (_req, res) => {
  res.status(429).json({
    success: false,
    code: "RATE_LIMITED",
    message,
  });
};

const createLoginLimiter = ({
  windowMs = Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  max = Number(process.env.LOGIN_RATE_LIMIT_MAX || 10),
} = {}) => rateLimit({
  windowMs,
  max,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: jsonHandler("Too many login attempts. Please try again later."),
});

const createBetLimiter = ({
  windowMs = Number(process.env.BET_RATE_LIMIT_WINDOW_MS || 10 * 1000),
  max = Number(process.env.BET_RATE_LIMIT_MAX || 20),
} = {}) => rateLimit({
  windowMs,
  max,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => `${req.user?._id?.toString() || "anonymous"}:${ipKeyGenerator(req.ip)}`,
  handler: jsonHandler("Too many bet requests. Please slow down."),
});

const loginLimiter = createLoginLimiter();
const betLimiter = createBetLimiter();

module.exports = {
  loginLimiter,
  betLimiter,
  createLoginLimiter,
  createBetLimiter,
};
