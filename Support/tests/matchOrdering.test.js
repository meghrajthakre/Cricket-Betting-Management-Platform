import test from "node:test";
import assert from "node:assert/strict";
import { sortMatchesForSupport } from "../src/features/matches/matchOrdering.js";

test("support matches show today by time, then future, then past", () => {
  const now = new Date(2026, 7, 15, 8, 0);
  const matches = [
    { matchId: "future", commenceTime: new Date(2026, 7, 16, 9, 0) },
    { matchId: "today-evening", commenceTime: new Date(2026, 7, 15, 18, 0) },
    { matchId: "past-old", commenceTime: new Date(2026, 7, 12, 15, 0) },
    { matchId: "today-ten", commenceTime: new Date(2026, 7, 15, 10, 0) },
    { matchId: "past-recent", commenceTime: new Date(2026, 7, 14, 11, 0) },
    { matchId: "missing", commenceTime: null },
  ];

  assert.deepEqual(
    sortMatchesForSupport(matches, now).map((match) => match.matchId),
    ["today-ten", "today-evening", "future", "past-recent", "past-old", "missing"]
  );
});

test("sorting does not mutate the API response array", () => {
  const matches = [
    { matchId: "later", commenceTime: new Date(2026, 7, 15, 12, 0) },
    { matchId: "earlier", commenceTime: new Date(2026, 7, 15, 10, 0) },
  ];
  sortMatchesForSupport(matches, new Date(2026, 7, 15, 8, 0));
  assert.deepEqual(matches.map((match) => match.matchId), ["later", "earlier"]);
});
