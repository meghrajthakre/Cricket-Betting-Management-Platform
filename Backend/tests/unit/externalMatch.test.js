"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const AppError = require("../../src/utils/AppError");
const {
  DEFAULT_EXTERNAL_MATCH_URL,
  parseExternalMatches,
  fetchExternalMatches,
  clearExternalMatchCache,
  toSavedMatchPayload,
} = require("../../src/modules/external-match/external-match.service");

const form = ({ matchId = "1.261491407", team1 = "Alleppey Ripples", team2 = "Aries Kollam Sailors", eventId = "35977395" } = {}) => `
  <form action="https://top11.tech/support/addMatch" method="post">
    <input name="team1" type="hidden" value="${team1}" />
    <input name="team2" type="hidden" value="${team2}" />
    <input name="date" type="hidden" value=" 2026-08-25 14:30:00 " />
    <input name="type" type="hidden" value=" T20 " />
    <input name="time" type="hidden" value=" N " />
    <input name="matchID" type="hidden" value="${matchId}" />
    <input name="eventID" type="hidden" value="${eventId}" />
  </form>`;

test("external HTML parser normalizes one match, trims fields and keeps IDs as strings", () => {
  const [match] = parseExternalMatches(form({ matchId: " 1.261491407 ", eventId: " 35977395 " }));
  assert.deepEqual(match, {
    matchId: "1.261491407", eventId: "35977395", team1: "Alleppey Ripples", team2: "Aries Kollam Sailors",
    type: "T20", startTime: "2026-08-25 14:30:00", timeStatus: "N",
  });
  assert.equal(typeof match.matchId, "string");
  assert.equal(typeof match.eventId, "string");
});

test("parser extracts multiple forms and deduplicates by matchId", () => {
  const html = form() + form({ matchId: "2.5", team1: "Team C", team2: "Team D" }) + form();
  assert.deepEqual(parseExternalMatches(html).map((match) => match.matchId), ["1.261491407", "2.5"]);
});

test("parser preserves inputs inside the provider's invalid form-wrapped table row", () => {
  const malformedProviderHtml = `
    <table><form action="https://top11.tech/support/addMatch" method="post"><tr><td>
      <input name="team1" type="hidden" value="Team A" />
      <input name="team2" type="hidden" value="Team B" />
      <input name="matchID" type="hidden" value="provider-1" />
      <input name="eventID" type="hidden" value="event-1" />
    </td></tr></form></table>`;

  assert.deepEqual(parseExternalMatches(malformedProviderHtml), [{
    matchId: "provider-1", eventId: "event-1", team1: "Team A", team2: "Team B",
    type: "", startTime: "", timeStatus: "",
  }]);
});

test("parser ignores manual empty forms and matches missing required fields", () => {
  const manual = '<form action="/support/addMatch"><input name="matchID"><input name="team1"><input name="team2"></form>';
  const missingId = form({ matchId: "" });
  const missingTeam1 = form({ matchId: "missing-team-1", team1: "" });
  const missingTeam2 = form({ matchId: "missing-team-2", team2: "" });
  assert.deepEqual(parseExternalMatches(manual + missingId + missingTeam1 + missingTeam2), []);
});

test("empty and malformed HTML never crash and return an empty list", () => {
  assert.deepEqual(parseExternalMatches(""), []);
  assert.deepEqual(parseExternalMatches("<html><form><input name='matchID' value='broken'>"), []);
});

test("fetch uses only the configured upstream URL, caches results and ignores arbitrary options", async () => {
  clearExternalMatchCache();
  const calls = [];
  const httpClient = { get: async (url) => {
    calls.push(url);
    return { data: form(), headers: { "content-type": "text/html; charset=utf-8" } };
  } };
  const first = await fetchExternalMatches({ httpClient, forceRefresh: true, url: "http://attacker.invalid" });
  const second = await fetchExternalMatches({ httpClient });
  assert.equal(first.length, 1);
  assert.equal(second.length, 1);
  assert.deepEqual(calls, [process.env.EXTERNAL_MATCH_URL || DEFAULT_EXTERNAL_MATCH_URL]);
});

test("fetch maps timeout, upstream 500 and network failures to safe operational errors", async () => {
  const cases = [
    [{ code: "ECONNABORTED" }, 504, "EXTERNAL_MATCH_TIMEOUT"],
    [{ response: { status: 500 } }, 502, "EXTERNAL_MATCH_UNAVAILABLE"],
    [{ code: "ECONNRESET" }, 502, "EXTERNAL_MATCH_UNAVAILABLE"],
  ];
  for (const [cause, statusCode, code] of cases) {
    clearExternalMatchCache();
    await assert.rejects(
      fetchExternalMatches({ forceRefresh: true, httpClient: { get: async () => { throw cause; } } }),
      (error) => error instanceof AppError && error.statusCode === statusCode && error.code === code
    );
  }
});

test("fetch rejects non-HTML upstream responses", async () => {
  clearExternalMatchCache();
  await assert.rejects(
    fetchExternalMatches({ forceRefresh: true, httpClient: { get: async () => ({ data: "{}", headers: { "content-type": "application/json" } }) } }),
    (error) => error.statusCode === 502 && error.code === "EXTERNAL_MATCH_CONTENT_TYPE"
  );
});

test("external match maps to saved-match fields without losing provider fields", () => {
  const external = {
    matchId: "1.261491407", eventId: "35977395", team1: "Alleppey Ripples",
    team2: "Aries Kollam Sailors", type: "T20", startTime: "2026-08-25 14:30:00", timeStatus: "N",
  };

  assert.deepEqual(toSavedMatchPayload(external), {
    ...external,
    source: "external",
    homeTeam: external.team1,
    awayTeam: external.team2,
    commenceTime: external.startTime,
    sportKey: external.type,
    odds: null,
  });
});
