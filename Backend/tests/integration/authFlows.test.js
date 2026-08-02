"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const app = require("../../server");
const { User } = require("../../src/modules/user/user.model");

const enabled = (
  process.env.TEST_ALLOW_DB_WRITES === "true" &&
  Boolean(process.env.TEST_MONGODB_URI)
);

let server;
let baseUrl;
let activeUser;
let blockedUser;

const postLogin = (username, password) => fetch(`${baseUrl}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username, password }),
});

test.before(async () => {
  if (!enabled) return;
  await mongoose.connect(process.env.TEST_MONGODB_URI);
  const stamp = Date.now();
  [activeUser, blockedUser] = await User.create([
    {
      username: `loginactive${stamp}`,
      firstName: "Active",
      password: "correct-password-123",
      role: "user",
      coins: 250,
    },
    {
      username: `loginblocked${stamp}`,
      password: "correct-password-123",
      role: "user",
      isActive: false,
    },
  ]);
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  if (!enabled) return;
  await new Promise((resolve) => server.close(resolve));
  await User.deleteMany({ _id: { $in: [activeUser._id, blockedUser._id] } });
  await mongoose.disconnect();
});

test("profile endpoint rejects unauthenticated requests", { skip: !enabled }, async () => {
  const response = await fetch(`${baseUrl}/api/auth/me`);
  assert.equal(response.status, 401);
});

test("login rejects an incorrect password without revealing account details", { skip: !enabled }, async () => {
  const response = await postLogin(activeUser.username, "wrong-password");
  const body = await response.json();
  assert.equal(response.status, 401);
  assert.match(body.message || body.error, /invalid username or password/i);
  assert.equal(JSON.stringify(body).includes(activeUser.username), false);
});

test("login rejects a blocked account", { skip: !enabled }, async () => {
  const response = await postLogin(blockedUser.username, "correct-password-123");
  const body = await response.json();
  assert.equal(response.status, 403);
  assert.match(body.message || body.error, /blocked/i);
});

test("successful login returns a usable token without leaking password data", { skip: !enabled }, async () => {
  const response = await postLogin(activeUser.username, "correct-password-123");
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(typeof body.data.accessToken, "string");
  assert.equal(body.data.user.username, activeUser.username);
  assert.equal(body.data.user.coins, 250);
  assert.equal("password" in body.data.user, false);

  const profileResponse = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${body.data.accessToken}` },
  });
  const profileBody = await profileResponse.json();
  assert.equal(profileResponse.status, 200);
  assert.equal(profileBody.data.user.username, activeUser.username);
  assert.equal("password" in profileBody.data.user, false);
});

