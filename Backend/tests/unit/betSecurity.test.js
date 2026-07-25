"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  acceptCurrentMarketRate,
  waitForBetDelay,
  calculateBetFinancials,
  addBetToPositions,
  requiredExposure,
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

test("YES bet calculates profit and full-stake liability", () => {
  assert.deepEqual(
    calculateBetFinancials("yes", 1000, 91),
    { profit: 910, liability: 1000 }
  );
});

test("NO bet calculates full-stake profit and rate-based liability", () => {
  assert.deepEqual(
    calculateBetFinancials("no", 1000, 91),
    { profit: 1000, liability: 910 }
  );
});

test("financial calculations round decimal values to two places", () => {
  assert.deepEqual(
    calculateBetFinancials("yes", 123.45, 91.27),
    { profit: 112.67, liability: 123.45 }
  );
  assert.deepEqual(
    calculateBetFinancials("no", 123.45, 91.27),
    { profit: 123.45, liability: 112.67 }
  );
});

test("match exposure reflects YES and NO runner outcomes", () => {
  const runnerIds = ["team-a", "team-b"];
  const positions = { "team-a": 0, "team-b": 0 };

  addBetToPositions(positions, runnerIds, {
    marketId: "team-a",
    type: "yes",
    profit: 900,
    loss: 1000,
  });
  assert.deepEqual(positions, { "team-a": 900, "team-b": -1000 });
  assert.equal(requiredExposure(positions), 1000);

  addBetToPositions(positions, runnerIds, {
    marketId: "team-b",
    type: "yes",
    profit: 900,
    loss: 1000,
  });
  assert.deepEqual(positions, { "team-a": -100, "team-b": -100 });
  assert.equal(requiredExposure(positions), 100);
});

test("required exposure never becomes negative", () => {
  assert.equal(requiredExposure({ a: 250, b: 100 }), 0);
  assert.equal(requiredExposure({ a: -123.456, b: 500 }), 123.46);
});
