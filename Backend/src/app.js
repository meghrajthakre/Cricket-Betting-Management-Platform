"use strict";

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const authRoutes = require("./modules/auth/auth.routes");
const superAdminRoutes = require("./modules/admin/admin.routes");
const superUserRoutes = require("./modules/admin/admin-users.routes");
const bannerRoutes = require("./modules/banner/banner.routes");
const superRoutes = require("./modules/admin/admin-profile.routes");
const supportRoutes = require("./modules/support/support.routes");
const savedMatchRoutes = require("./modules/saved-match/saved-match.routes");
const ledgerRoutes = require("./modules/ledger/ledger.routes");
const betRoutes = require("./modules/bet/bet.routes");
const walletRoutes = require("./modules/wallet/wallet.routes");
const cricketRoutes = require("./modules/cricket/cricket.routes");
const manualRoutes = require("./modules/manual/manual.routes");
const sessionRoutes = require("./modules/session/session.routes");
const subCompanyRoutes = require("./modules/sub-company/sub-company.routes");

const app = express();
app.set("trust proxy", 1);

app.use(cors({
  // Temporary: reflect every requesting origin so credentialed requests work.
  // Replace this with an explicit production allowlist before deployment.
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
  exposedHeaders: ["X-Total-Count", "X-Page-Count"],
  maxAge: 86400,
  optionsSuccessStatus: 200,
}));

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Betting Dashboard API is healthy",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

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
app.use("/api/session", sessionRoutes);
app.use("/api/sub-companies", subCompanyRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
