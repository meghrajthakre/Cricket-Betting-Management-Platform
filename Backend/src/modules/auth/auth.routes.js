"use strict";

const { Router } = require("express");
const { login, logout, getMe } = require("./auth.controller");
const { protect } = require("../../middleware/authMiddleware");
const { validateBody, loginSchema } = require("../../utils/validators");
const { loginLimiter } = require("../../middleware/rateLimiters");

const router = Router();

/**
 * POST /auth/login
 * Body: { username, password }
 * Returns: httpOnly access + refresh token cookies
 */
router.post("/login", loginLimiter, validateBody(loginSchema), login);

/**
 * POST /auth/logout
 * Clears cookies + invalidates refresh token in DB
 */
router.post("/logout", protect, logout);


/**
 * GET /auth/me
 * Returns current authenticated user's profile
 */
router.get("/me", protect, getMe);

module.exports = router;
