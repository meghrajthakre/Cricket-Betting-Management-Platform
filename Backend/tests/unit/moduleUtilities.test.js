"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { getState, updateRunnerInCache, setInitialState } = require("../../src/modules/manual/manual.engine");
const { DEFAULT_OPTIONS } = require("../../src/modules/manual/manual-options.service");
const { sessionTemplate, sessionTemplates } = require("../../src/modules/session/session.catalog");
const { extractOdds, normaliseEvent } = require("../../src/modules/cricket/cricket.service");

test("manual engine initializes, replaces and isolates runner state per match", () => {
  const firstMatch = `manual-a-${Date.now()}`;
  const secondMatch = `manual-b-${Date.now()}`;

  assert.deepEqual(getState(firstMatch), []);
  setInitialState(firstMatch, [
    { runnerId: "home", lagai: 90 },
    { runnerId: "away", lagai: 95 },
  ]);
  updateRunnerInCache(firstMatch, { runnerId: "home", lagai: 80 });
  updateRunnerInCache(secondMatch, { runnerId: "draw", lagai: 100 });

  assert.deepEqual(getState(firstMatch), [
    { runnerId: "home", lagai: 80 },
    { runnerId: "away", lagai: 95 },
  ]);
  assert.deepEqual(getState(secondMatch), [{ runnerId: "draw", lagai: 100 }]);
});

test("session catalog creates independent pending templates for a match", () => {
  const templates = sessionTemplates("match-catalog-test");
  assert.ok(templates.length > 0);
  assert.ok(templates.every((session) => session.matchId === "match-catalog-test"));
  assert.ok(templates.every((session) => session.resultStatus === "pending" && session.resultRun === null));
  assert.ok(templates.every((session) => session.yesRun === Number(session.noRun) + Number(session.rateDiff || 1)));
  assert.equal(sessionTemplate("match-catalog-test", "missing-session-id"), null);
});

test("manual option defaults remain valid betting limits and delays", () => {
  assert.ok(DEFAULT_OPTIONS.matchMaxBet > 0);
  assert.ok(DEFAULT_OPTIONS.sessionMaxBet > 0);
  assert.ok(DEFAULT_OPTIONS.matchDelay >= 0);
  assert.ok(DEFAULT_OPTIONS.sessionDelay >= 0);
  assert.equal(DEFAULT_OPTIONS.tossVisibility, "remove");
  assert.equal(Object.isFrozen(DEFAULT_OPTIONS), true);
});

test("cricket odds extraction ignores non-h2h markets and finds the price range", () => {
  const result = extractOdds({
    bookmakers: [
      { markets: [{ key: "totals", outcomes: [{ price: 99 }] }, { key: "h2h", outcomes: [{ price: 1.8 }, { price: 2.4 }] }] },
      { markets: [{ key: "h2h", outcomes: [{ price: 1.65 }, { price: "3.0" }] }] },
    ],
  });

  assert.deepEqual(result, { minRate: 1.65, maxRate: 2.4 });
  assert.equal(extractOdds({ bookmakers: [] }), null);
  assert.equal(extractOdds({}), null);
});

test("cricket event normalization maps teams, scores and lifecycle status", () => {
  const future = new Date(Date.now() + 60_000).toISOString();
  const upcoming = normaliseEvent({
    id: "event-1",
    home_team: "Southern Brave",
    away_team: "Welsh Fire",
    commence_time: future,
    completed: false,
    scores: [{ name: "Southern Brave", score: "120" }],
    bookmakers: [],
  }, "cricket_test");
  const live = normaliseEvent({ id: "event-2", in_play: true, completed: false }, "cricket_test");
  const completed = normaliseEvent({ id: "event-3", completed: true }, "cricket_test");

  assert.equal(upcoming.status, "Upcoming");
  assert.equal(upcoming.homeScore, "120");
  assert.equal(upcoming.awayScore, null);
  assert.equal(upcoming.odds, null);
  assert.equal(live.status, "Live");
  assert.equal(completed.status, "Completed");
});
