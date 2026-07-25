"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  acceptCurrentMarketRate,
  waitForBetDelay,
} = require("../../src/modules/bet/bet.service");

test("authoritative market rate accepts an unchanged price", () => {
  assert.equal(acceptCurrentMarketRate(91.2, 91.20), 91.2);
});

test("tampered or stale rate is rejected with PRICE_CHANGED", () => {
  assert.throws(
    () => acceptCurrentMarketRate(999999, 91),
    (error) => (
      error.statusCode === 409 &&
      error.code === "PRICE_CHANGED" &&
      error.currentRate === 91
    )
  );
});

test("unavailable market rate is rejected", () => {
  assert.throws(
    () => acceptCurrentMarketRate(1, 0),
    (error) => error.statusCode === 409 && error.code === "MARKET_RATE_UNAVAILABLE"
  );
});

test("configured bet delay waits and zero delay returns immediately", async () => {
  const immediateStart = Date.now();
  await waitForBetDelay(0);
  assert.ok(Date.now() - immediateStart < 100);

  const delayedStart = Date.now();
  await waitForBetDelay(0.15);
  assert.ok(Date.now() - delayedStart >= 130);
});
