"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeBps, getCompanyShareBps, scaleBetForShare, scaleBetForRemainder } = require("../../src/modules/bet/bet-share.service");

const bet = { amount: 100, profit: 90, loss: 100, walletAdjustment: 25 };

test("0% share returns zero financial values", () => {
  const result = scaleBetForShare(bet, 0);
  assert.deepEqual(
    { amount: result.amount, profit: result.profit, loss: result.loss, walletAdjustment: result.walletAdjustment },
    { amount: 0, profit: 0, loss: 0, walletAdjustment: 0 },
  );
});

test("95% and retained 5% add back to the original values", () => {
  const company = scaleBetForShare(bet, 9500);
  const owner = scaleBetForShare(bet, 500);
  for (const field of ["amount", "profit", "loss", "walletAdjustment"])
    assert.equal(company[field] + owner[field], bet[field]);
});

test("share calculations round monetary values to two decimals", () => {
  const company = scaleBetForShare({ amount: 1.01, profit: 1.01, loss: 1.01 }, 3333);
  const owner = scaleBetForShare({ amount: 1.01, profit: 1.01, loss: 1.01 }, 6667);
  assert.equal(company.amount, 0.34);
  assert.equal(owner.amount, 0.67);
  assert.equal(company.amount + owner.amount, 1.01);
});

test("remainder calculation preserves every paisa after rounding", () => {
  const tinyBet = { amount: 0.01, profit: 0.01, loss: 0.01 };
  const company = scaleBetForShare(tinyBet, 5000);
  const owner = scaleBetForRemainder(tinyBet, 5000);
  assert.equal(company.amount + owner.amount, tinyBet.amount);
  assert.equal(company.profit + owner.profit, tinyBet.profit);
  assert.equal(company.loss + owner.loss, tinyBet.loss);
});

test("invalid basis points never expose full financial values", () => {
  assert.equal(normalizeBps(-1), 0);
  assert.equal(normalizeBps(10001), 0);
  assert.equal(normalizeBps(10.5), 0);
  assert.equal(normalizeBps("9500"), 0);
});

test("legacy Sub Companies use old downlineShare when basis points are absent", () => {
  assert.equal(getCompanyShareBps({ allocatedShareBps: 0, allocatedShare: 0, downlineShare: 95 }), 9500);
  assert.equal(getCompanyShareBps({ allocatedShareBps: 0, allocatedShare: 8750, downlineShare: 0 }), 8750);
  assert.equal(getCompanyShareBps({ allocatedShareBps: 0, allocatedShare: 0, downlineShare: 0 }), 0);
});
