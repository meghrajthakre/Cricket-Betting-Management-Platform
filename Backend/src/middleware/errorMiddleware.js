const mongoose = require("mongoose");
const AppError = require("../utils/AppError");

// ── 404 handler (must be registered AFTER all routes) ────────────────────────
const notFound = (req, _res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};

// ── Central error handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let errors;

  // ── Mongoose: Validation errors ──────────────────────────────────────────
  if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = "Validation error";
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  }

  // ── Mongoose: Duplicate key ──────────────────────────────────────────────
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || "field";
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
    errors = [{ field, message }];
  }

  // ── Mongoose: Bad ObjectId cast ──────────────────────────────────────────
  if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = `Invalid ${err.path}: "${err.value}"`;
  }

  // ── JWT errors ───────────────────────────────────────────────────────────
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  }
  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
  }

  // ── Logging ───────────────────────────────────────────────────────────────
  if (process.env.NODE_ENV === "development") {
    console.error(
      `[${new Date().toISOString()}] ${statusCode} ${req.method} ${req.originalUrl}\n`,
      err
    );
  } else if (statusCode >= 500) {
    // Log server errors in production (without stack)
    console.error(
      `[${new Date().toISOString()}] 500 | ${req.method} ${req.originalUrl} | ${message}`
    );
  }

  // ── Response ──────────────────────────────────────────────────────────────
  const body = { success: false, message };
  if (errors) body.errors = errors;
  if (err.code) body.code = err.code; // e.g. TOKEN_EXPIRED
  if (Number.isFinite(err.requiredFee)) body.requiredFee = err.requiredFee;
  if (Number.isFinite(err.currentBalance)) body.currentBalance = err.currentBalance;
  if (process.env.NODE_ENV === "development") body.stack = err.stack;

  res.status(statusCode).json(body);
};

module.exports = { notFound, errorHandler };
