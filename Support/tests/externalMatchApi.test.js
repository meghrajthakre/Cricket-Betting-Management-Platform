import test from "node:test";
import assert from "node:assert/strict";
import { addExternalMatch, fetchExternalAndSavedMatches } from "../src/features/matches/externalMatchApi.js";

test("Add Matches loader combines external matches with saved match IDs", async () => {
  const calls = [];
  const client = {
    get: async (path) => {
      calls.push(path);
      if (path === "/matches/external") return { data: { data: [{ matchId: "external-1" }] } };
      return { data: { data: [{ matchId: "external-1" }, { matchId: 22 }] } };
    },
  };

  const result = await fetchExternalAndSavedMatches(client);
  assert.deepEqual(calls, ["/matches/external", "/matches/saved"]);
  assert.deepEqual(result.matches, [{ matchId: "external-1" }]);
  assert.deepEqual(result.savedMatchIds, new Set(["external-1", "22"]));
});

test("Add Matches loader safely normalizes malformed API arrays", async () => {
  const client = { get: async () => ({ data: { data: null } }) };
  const result = await fetchExternalAndSavedMatches(client);
  assert.deepEqual(result.matches, []);
  assert.deepEqual(result.savedMatchIds, new Set());
});

test("Add Match sends only the selected matchId to the dedicated endpoint", async () => {
  const calls = [];
  const client = { post: async (path, body) => { calls.push({ path, body }); return { data: { success: true } }; } };
  await addExternalMatch("1.261491407", client);
  assert.deepEqual(calls, [{ path: "/matches/external/save", body: { matchId: "1.261491407" } }]);
});
