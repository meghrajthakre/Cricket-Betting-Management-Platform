"use strict";

const { z } = require("zod");

// ── Reusable field definitions ────────────────────────────────────────────────

const usernameField = z
  .string({ required_error: "username is required" })
  .trim()
  .toLowerCase()
  .min(3, "username must be at least 3 characters")
  .max(30, "username cannot exceed 30 characters")
  .regex(/^[a-zA-Z0-9_]+$/, "username may only contain letters, numbers, and underscores");

const passwordField = z
  .string({ required_error: "password is required" })
  .min(6, "password must be at least 6 characters")
  .max(100, "password cannot exceed 100 characters");

const amountField = z
  .number({ required_error: "amount is required", invalid_type_error: "amount must be a number" })
  .positive("amount must be positive")
  .finite("amount must be a finite number")
  .multipleOf(0.01, "amount supports up to 2 decimal places");

const reasonField = z
  .string({ required_error: "reason is required" })
  .trim()
  .min(3, "reason must be at least 3 characters")
  .max(200, "reason cannot exceed 200 characters");

// ── Schemas ───────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  username: usernameField,
  password: z.string({ required_error: "password is required" }).min(1, "password is required"),
});

const createAdminSchema = z.object({
  username: usernameField,
  password: passwordField,
});

const createUserSchema = z.object({
  username: usernameField,
  password: passwordField,
});

const addCoinsSchema = z.object({
  amount: amountField,
  reason: reasonField,
});

const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .default("1")
    .transform(Number)
    .refine((v) => Number.isInteger(v) && v > 0, "page must be a positive integer"),
  limit: z
    .string()
    .optional()
    .default("10")
    .transform(Number)
    .refine((v) => Number.isInteger(v) && v > 0 && v <= 100, "limit must be between 1 and 100"),
});

// ── Middleware factories ───────────────────────────────────────────────────────

/**
 * Validate req.body against a Zod schema.
 * Attaches parsed data to req.body (mutates in-place for cleaner controller code).
 */
const validateBody = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body ?? {});
  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: result.error?.errors?.map((e) => ({
        field: e.path.join(".") || "body",
        message: e.message,
      })) ?? [],
    });
  }
  req.body = result.data;
  next();
};

/**
 * Validate req.query against a Zod schema.
 * Attaches parsed data separately because req.query is getter-only in Express 5.
 */
const validateQuery = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    const issues = result.error?.issues ?? result.error?.errors ?? [];
    return res.status(400).json({
      success: false,
      message: "Invalid query parameters",
      errors: issues.map((e) => ({
        field: e.path.join(".") || "query",
        message: e.message,
      })),
    });
  }
  req.validatedQuery = result.data;
  next();
};

module.exports = {
  // Schemas
  loginSchema,
  createAdminSchema,
  createUserSchema,
  addCoinsSchema,
  paginationSchema,
  // Middleware
  validateBody,
  validateQuery,
};
