"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  checkFixLimit,
  normalizeCoins,
  validateUserLimitBounds,
} = require("../../src/modules/sub-company/sub-company-limit.service");

test("combined allocation can equal the Sub Company fix limit", () => {
  assert.equal(checkFixLimit(15000, 5000, 20000), 20000);
});

test("client limit must stay between used limit and Sub Company fix limit", () => {
  assert.equal(validateUserLimitBounds(5000, 1000, 10000), 5000);
  assert.equal(validateUserLimitBounds(1000, 1000, 10000), 1000);
  assert.equal(validateUserLimitBounds(10000, 1000, 10000), 10000);
  assert.throws(
    () => validateUserLimitBounds(10000.01, 1000, 10000),
    (error) => error.statusCode === 409 && error.code === "CLIENT_LIMIT_ABOVE_FIX_LIMIT"
  );
  assert.throws(
    () => validateUserLimitBounds(999.99, 1000, 10000),
    (error) => error.statusCode === 409 && error.code === "CLIENT_LIMIT_BELOW_USED_LIMIT"
  );
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
