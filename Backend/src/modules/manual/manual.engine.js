"use strict";

// In-memory cache of manual state: Map matchId => Map runnerId => runnerObj
const cache = new Map();

function getState(matchId) {
    const runners = cache.get(matchId);
    if (!runners) return [];
    return Array.from(runners.values());
}

function updateRunnerInCache(matchId, runner) {
    if (!cache.has(matchId)) cache.set(matchId, new Map());
    cache.get(matchId).set(runner.runnerId, runner);
}

function setInitialState(matchId, runnersArray) {
    const m = new Map();
    for (const r of runnersArray || []) {
        m.set(r.runnerId, r);
    }
    cache.set(matchId, m);
}

module.exports = { getState, updateRunnerInCache, setInitialState };
