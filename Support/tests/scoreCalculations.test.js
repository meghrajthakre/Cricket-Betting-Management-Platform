import test from "node:test";
import assert from "node:assert/strict";
import {
    advanceOverByOneBall,
    parseButtonAction,
    reverseOverByOneBall,
} from "../src/features/matches/live/ScorePage/utils/scoreCalculations.js";

test("regular run buttons add runs and advance one legal ball", () => {
    assert.deepEqual(parseButtonAction("0 RUN"), {
        runs: 0,
        advanceBall: true,
        statusLabel: "0 RUN",
    });
    assert.deepEqual(parseButtonAction("6 RUN"), {
        runs: 6,
        advanceBall: true,
        statusLabel: "6 RUN",
    });
});

test("OUT records a wicket and advances one legal ball", () => {
    assert.deepEqual(parseButtonAction("OUT"), {
        wickets: 1,
        advanceBall: true,
        statusLabel: "OUT",
    });
});

test("wide and no-ball add the mandatory extra without advancing the over", () => {
    for (const label of ["WIDE BALL", "NO BALL"]) {
        assert.deepEqual(parseButtonAction(label), {
            runs: 1,
            advanceBall: false,
            statusLabel: label,
            isExtra: true,
        });
    }
});

test("run plus extra includes both entered runs and mandatory extra", () => {
    assert.deepEqual(parseButtonAction("4 + WIDE BALL"), {
        runs: 5,
        advanceBall: false,
        statusLabel: "4 + WIDE BALL",
        isExtra: true,
    });
    assert.deepEqual(parseButtonAction("6 + No Ball"), {
        runs: 7,
        advanceBall: false,
        statusLabel: "6 + No Ball",
        isExtra: true,
    });
});

test("run plus OUT adds runs, wicket, and a legal delivery", () => {
    assert.deepEqual(parseButtonAction("2 + OUT"), {
        runs: 2,
        wickets: 1,
        advanceBall: true,
        statusLabel: "2 + OUT",
    });
});

test("wide plus OUT keeps the delivery illegal", () => {
    assert.deepEqual(parseButtonAction("WIDE BALL + OUT"), {
        runs: 1,
        wickets: 1,
        advanceBall: false,
        statusLabel: "WIDE BALL + OUT",
        isExtra: true,
    });
});

test("market and review buttons map to control actions without changing score", () => {
    assert.deepEqual(parseButtonAction("BET OPEN"), {
        marketStatus: "OPEN",
        statusLabel: "BET OPEN",
    });
    assert.deepEqual(parseButtonAction("BET CLOSED"), {
        marketStatus: "CLOSED",
        statusLabel: "BET CLOSED",
    });
    assert.deepEqual(parseButtonAction("SCORE BACK"), {
        isUndo: true,
        statusLabel: "SCORE BACK",
    });
    assert.deepEqual(parseButtonAction("NOT OUT"), {
        statusLabel: "NOT OUT",
        isNotOutReview: true,
    });
});

test("legal deliveries advance using cricket over notation", () => {
    assert.equal(advanceOverByOneBall(0), 0.1);
    assert.equal(advanceOverByOneBall(4.4), 4.5);
    assert.equal(advanceOverByOneBall(4.5), 5);
    assert.equal(advanceOverByOneBall(19.5), 20);
});

test("score back reverses cricket over notation and never goes below zero", () => {
    assert.equal(reverseOverByOneBall(7.2), 7.1);
    assert.equal(reverseOverByOneBall(7.1), 7);
    assert.equal(reverseOverByOneBall(7), 6.5);
    assert.equal(reverseOverByOneBall(0), 0);
    assert.equal(reverseOverByOneBall(-1), 0);
});

test("unknown status labels do not mutate runs, wickets, or overs", () => {
    assert.deepEqual(parseButtonAction("DRINK BREAK"), {
        statusLabel: "DRINK BREAK",
    });
});
