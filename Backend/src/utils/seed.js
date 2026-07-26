require("dotenv").config();
const connectDB = require("../config/db");
const { User, ROLES } = require("../modules/user/user.model");

const DEFAULT_USERNAME = "superadmin";
const DEFAULT_PASSWORD = "SuperAdmin@123";

const seed = async () => {
  console.log("\n🌱  Running seed script…\n");

  await connectDB();

  const username = (process.env.SUPERADMIN_USERNAME || DEFAULT_USERNAME).toLowerCase().trim();
  const password = process.env.SUPERADMIN_PASSWORD || DEFAULT_PASSWORD;

  const existing = await User.findOne({ username });
  if (existing) {
    console.log(`⚠️   Superadmin "${username}" already exists. Nothing to do.\n`);
    process.exit(0);
  }

  const superadmin = await User.create({
    username,
    password,
    role: ROLES.SUPERADMIN,
    myShare: 0,      
    downlineShare: 100,  
    ledgerShare: 0,
    createdBy: null,
  });
  console.log("✅  Superadmin created:");
  console.log(`    Username : ${superadmin.username}`);
  console.log(`    Role     : ${superadmin.role}`);
  console.log(`    ID       : ${superadmin._id}`);
  console.log("\n⚠️   Change the default password immediately after first login!\n");

  process.exit(0);
};

seed().catch((err) => {
  console.error("❌  Seed failed:", err.message);
  process.exit(1);
});
