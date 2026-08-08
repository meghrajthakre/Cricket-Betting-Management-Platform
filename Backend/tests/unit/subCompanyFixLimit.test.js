"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  checkFixLimit,
  normalizeCoins,
} = require("../../src/modules/sub-company/sub-company-limit.service");

test("combined allocation can equal the Sub Company fix limit", () => {
  assert.equal(checkFixLimit(15000, 5000, 20000), 20000);
});

test("combined allocation cannot exceed the Sub Company fix limit", () => {
  assert.throws(
    () => checkFixLimit(15000, 5000.01, 20000),
    (error) => error.statusCode === 409 &&
      error.code === "FIX_LIMIT_EXCEEDED" &&
      /Available limit is 5000/.test(error.message)
  );
});

test("coin allocation rejects negative, infinite and unsafe amounts", () => {
  assert.equal(normalizeCoins("250.25"), 250.25);
  for (const value of [-1, Infinity, NaN, Number.MAX_VALUE]) {
    assert.throws(() => normalizeCoins(value), (error) => error.statusCode === 400);
  }
});
