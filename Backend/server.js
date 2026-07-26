"use strict";

require("dotenv").config();

const app = require("./src/app");
const connectDB = require("./src/config/db");

const port = Number(process.env.PORT) || 5000;

async function start() {
  try {
    await connectDB();
    app.listen(port, () => {
      const environment = process.env.NODE_ENV || "development";
      console.log("");
      console.log("╔════════════════════════════════════════════╗");
      console.log("║      Betting Dashboard API                 ║");
      console.log("╠════════════════════════════════════════════╣");
      console.log(`║  🚀  http://localhost:${port}                 ║`);
      console.log(`║  🌍  ${environment.padEnd(36)}  ║`);
      console.log("╚════════════════════════════════════════════╝");
      console.log("");
    });
  } catch (error) {
    console.error("Server failed to start:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = app;
