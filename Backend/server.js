"use strict";
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");

const connectDB = require("./src/config/db");
const { notFound, errorHandler } = require("./src/middleware/errorMiddleware");

// ── Route imports ─────────────────────────────────────────────────────────────
const authRoutes = require("./src/routes/authRoutes");
const superAdminRoutes = require("./src/routes/superAdminRoutes");
const superUserRoutes = require("./src/routes/superadminUserRoutes");
const bannerRoutes = require("./src/routes/bannerRoutes");
const superRoutes = require("./src/routes/superRoutes");
const { saveMatch } = require("./src/services/Savedmatchservice");
const savedMatchRoutes = require("./src/routes/SavedMatchRoutes");
const ledgerRoutes = require("./src/modules/ledger/ledger.routes");
const betRoutes = require("./src/modules/bet/bet.routes");
const walletRoutes = require("./src/modules/wallet/wallet.routes");
const cricketRoutes = require("./src/routes/cricketroutes");
const supportRoutes = require("./src/routes/supportRoutes");
const manualRoutes = require("./src/routes/manualRoutes");

// ── App initialisation ────────────────────────────────────────────────────────
const app = express();
app.set("trust proxy", 1);

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "https://firstfreelance-project.vercel.app",
  "https://superadmin-phi-eight.vercel.app",
  "https://firstfreelance-project-4uv9.vercel.app",
  "firstfreelance-project-jsft8o6fm-meghrajthakres-projects.vercel.app",
  "https://superadmin-oy4sv2xkd-meghrajthakres-projects.vercel.app",
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server requests (Postman, curl, health checks)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked request from origin: ${origin}`);
      callback(new Error(`CORS policy: origin '${origin}' is not allowed`));
    }
  },
  credentials: true, // Allow cookies / Authorization headers
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
  exposedHeaders: ["X-Total-Count", "X-Page-Count"], // expose custom headers to client if needed
  maxAge: 86400, // Cache preflight response for 24h (reduces OPTIONS spam)
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
};

app.use(cors(corsOptions));

// ── Body parsing & cookie parser ──────────────────────────────────────────────
app.use(express.json({ limit: "10kb" })); // Guard against large payload attacks
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());



// ── Health check ──────────────────────────────────────────────────────────────
app.get("/", (_req, res) =>
  res.status(200).json({
    success: true,
    message: "Betting Dashboard API is healthy",
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
  }),
);

// ── API Routes ────────────────────────────────────────────────────────────────
app.use(cookieParser());



// Routes
app.use("/api/auth", authRoutes);
app.use("/api/superadmin", superAdminRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/superadmin/users", superUserRoutes);
app.use("/api/banner", bannerRoutes);
app.use("/api/superadmin", superRoutes);
app.use("/api/matches", savedMatchRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/ledger", ledgerRoutes);
app.use("/api/bet", betRoutes);
app.use("/api/cricket", cricketRoutes);
app.use("/api/manual", manualRoutes);

// ── 404 + global error handler (must be last) ─────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start server ──────────────────────────────────────────────────────────────
const start = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log("");
      console.log("╔══════════════════════════════════════════╗");
      console.log("║      Betting Dashboard API               ║");
      console.log("╠══════════════════════════════════════════╣");
      console.log(`║  🚀  http://localhost:${PORT}               ║`);
      console.log(`║  🌍  ${NODE_ENV.padEnd(36)}║`);
      console.log("╚══════════════════════════════════════════╝");
      console.log("");
    });
  } catch (err) {
    console.error("❌  Server failed to start:", err.message);
    process.exit(1);
  }
};

if (require.main === module) {
  start();
}

module.exports = app;
