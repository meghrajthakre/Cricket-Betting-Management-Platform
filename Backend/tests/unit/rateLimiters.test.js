"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const {
  createLoginLimiter,
  createBetLimiter,
} = require("../../src/middleware/rateLimiters");

async function withServer(app, callback) {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  try {
    await callback(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("login limiter blocks repeated failed attempts with 429", async () => {
  const app = express();
  app.use(createLoginLimiter({ windowMs: 10_000, max: 2 }));
  app.post("/login", (_req, res) => res.status(401).json({ success: false }));

  await withServer(app, async (baseUrl) => {
    assert.equal((await fetch(`${baseUrl}/login`, { method: "POST" })).status, 401);
    assert.equal((await fetch(`${baseUrl}/login`, { method: "POST" })).status, 401);
    const blocked = await fetch(`${baseUrl}/login`, { method: "POST" });
    assert.equal(blocked.status, 429);
    assert.equal((await blocked.json()).code, "RATE_LIMITED");
  });
});

test("successful logins do not consume failed-login allowance", async () => {
  const app = express();
  app.use(createLoginLimiter({ windowMs: 10_000, max: 1 }));
  app.post("/login", (_req, res) => res.status(200).json({ success: true }));

  await withServer(app, async (baseUrl) => {
    assert.equal((await fetch(`${baseUrl}/login`, { method: "POST" })).status, 200);
    assert.equal((await fetch(`${baseUrl}/login`, { method: "POST" })).status, 200);
  });
});

test("bet limiter applies independently per authenticated user", async () => {
  const app = express();
  app.use((req, _res, next) => {
    req.user = { _id: req.headers["x-test-user"] || "anonymous" };
    next();
  });
  app.use(createBetLimiter({ windowMs: 10_000, max: 1 }));
  app.post("/bet", (_req, res) => res.status(201).json({ success: true }));

  await withServer(app, async (baseUrl) => {
    const request = (user) => fetch(`${baseUrl}/bet`, {
      method: "POST",
      headers: { "x-test-user": user },
    });
    assert.equal((await request("user-a")).status, 201);
    assert.equal((await request("user-a")).status, 429);
    assert.equal((await request("user-b")).status, 201);
  });
});
