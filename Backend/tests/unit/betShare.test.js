"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeBps, getCompanyShareBps, getViewerShareBps, scaleBetForShare, scaleBetForRemainder, scaleBetForViewer, buildShareSnapshot } = require("../../src/modules/bet/bet-share.service");

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

test("multi-level hierarchy produces retained shares totaling exactly 100%", () => {
  const snapshot = buildShareSnapshot([
    { _id: "super", role: "superadmin" },
    { _id: "company", role: "sub_company", allocatedShareBps: 9500 },
    { _id: "master", role: "sub_master", allocatedShareBps: 8000 },
    { _id: "sst", role: "sst", allocatedShareBps: 6000 },
  ]);
  assert.deepEqual(snapshot.map(({ role, shareBps }) => ({ role, shareBps })), [
    { role: "superadmin", shareBps: 500 },
    { role: "sub_company", shareBps: 1500 },
    { role: "sub_master", shareBps: 2000 },
    { role: "sst", shareBps: 6000 },
  ]);
  assert.equal(snapshot.reduce((total, item) => total + item.shareBps, 0), 10000);
});

test("viewer receives only their snapshotted retained share", () => {
  const sharedBet = { ...bet, shareSnapshot: [{ userId: "company", role: "sub_company", shareBps: 1500 }] };
  assert.equal(getViewerShareBps(sharedBet, "company"), 1500);
  assert.equal(scaleBetForViewer(sharedBet, "company").amount, 15);
});

test("child cannot receive more share than its parent", () => {
  assert.throws(() => buildShareSnapshot([
    { _id: "super", role: "superadmin" },
    { _id: "company", role: "sub_company", allocatedShareBps: 8000 },
    { _id: "master", role: "sub_master", allocatedShareBps: 9000 },
  ]), /Invalid hierarchy share/);
});
