"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { sessionBetWon } = require("../../src/modules/session/session.service");

const yesBet = { type: "yes", sessionRun: 120 };
const noBet = { type: "no", sessionRun: 120 };

test("YES session passes when result equals or exceeds selected run", () => {
  assert.equal(sessionBetWon(yesBet, 120), true);
  assert.equal(sessionBetWon(yesBet, 121), true);
  assert.equal(sessionBetWon(yesBet, 119), false);
});

test("NO session passes only when result is below selected run", () => {
  assert.equal(sessionBetWon(noBet, 119), true);
  assert.equal(sessionBetWon(noBet, 120), false);
  assert.equal(sessionBetWon(noBet, 121), false);
});
