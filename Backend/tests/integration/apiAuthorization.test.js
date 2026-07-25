"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const app = require("../../server");
const { User } = require("../../src/models/User");
const { Ledger } = require("../../src/modules/ledger/ledger.model");
const { generateAccessToken } = require("../../src/utils/generateToken");

const enabled = (
  process.env.TEST_ALLOW_DB_WRITES === "true" &&
  Boolean(process.env.TEST_MONGODB_URI)
);

let server;
let baseUrl;
let normalUser;
let otherUser;
let superadmin;

const auth = (user) => ({
  Authorization: `Bearer ${generateAccessToken({ id: user._id, role: user.role })}`,
  "Content-Type": "application/json",
});

test.before(async () => {
  if (!enabled) return;
  await mongoose.connect(process.env.TEST_MONGODB_URI);
  const stamp = Date.now();
  [normalUser, otherUser, superadmin] = await User.create([
    { username: `authuser${stamp}`, password: "test-password-123", role: "user", coins: 100 },
    { username: `otheruser${stamp}`, password: "test-password-123", role: "user", coins: 100 },
    { username: `authadmin${stamp}`, password: "test-password-123", role: "superadmin", coins: 0 },
  ]);
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  if (!enabled) return;
  await new Promise((resolve) => server.close(resolve));
  await Ledger.deleteMany({ userId: { $in: [normalUser._id, otherUser._id] } });
  await User.deleteMany({ _id: { $in: [normalUser._id, otherUser._id, superadmin._id] } });
  await mongoose.disconnect();
});

test("wallet endpoint rejects missing authentication", { skip: !enabled }, async () => {
  const response = await fetch(`${baseUrl}/api/wallet/${normalUser._id}/balance`);
  assert.equal(response.status, 401);
});

test("user can read own wallet but not another user's wallet", { skip: !enabled }, async () => {
  const own = await fetch(`${baseUrl}/api/wallet/${normalUser._id}/balance`, {
    headers: auth(normalUser),
  });
  const other = await fetch(`${baseUrl}/api/wallet/${otherUser._id}/balance`, {
    headers: auth(normalUser),
  });
  assert.equal(own.status, 200);
  assert.equal(other.status, 403);
});

test("normal user cannot credit wallet", { skip: !enabled }, async () => {
  const response = await fetch(`${baseUrl}/api/wallet/credit`, {
    method: "POST",
    headers: auth(normalUser),
    body: JSON.stringify({ userId: normalUser._id.toString(), amount: 10 }),
  });
  assert.equal(response.status, 403);
});

test("superadmin can credit a user wallet", { skip: !enabled }, async () => {
  const response = await fetch(`${baseUrl}/api/wallet/credit`, {
    method: "POST",
    headers: auth(superadmin),
    body: JSON.stringify({ userId: normalUser._id.toString(), amount: 10 }),
  });
  assert.equal(response.status, 200);
  const refreshed = await User.findById(normalUser._id).lean();
  assert.equal(refreshed.coins, 110);
});
