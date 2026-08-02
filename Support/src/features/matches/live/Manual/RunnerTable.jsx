import { useState, useCallback, useEffect } from "react";
import { useParams } from "react-router-dom";
import apiClient from "../../../../shared/api/apiClient";
import { C } from "./constants";

const ODDS_OPTIONS = Array.from({ length: 98 }, (_, i) => i); // 0 to 97
const SUSPEND_VALUE = 97;

const FALLBACK_RUNNERS = [
  { id: "runner_1", name: "West Indies", odds: 0, touched: false },
  { id: "runner_2", name: "Sri Lanka", odds: 0, touched: false },
];

// Build the two runners from the fetched match's home/away teams,
// falling back to the static defaults if match data isn't available yet.
function buildDefaultRunners(match) {
  return [
    { id: "runner_1", name: match?.homeTeam || FALLBACK_RUNNERS[0].name, odds: 0, touched: false },
    { id: "runner_2", name: match?.awayTeam || FALLBACK_RUNNERS[1].name, odds: 0, touched: false },
  ];
}

// Pure odds+rateDiff math. Suspend value (97) always collapses to 0.
// NOTE: this no longer special-cases odds === 0 - once a runner is
// "touched" (see getKhai below), 0 is a real dropdown selection and should
// reflect rateDiff like any other value.
function computeKhai(odds, rateDiff) {
  return odds === SUSPEND_VALUE ? 0 : odds + rateDiff;
}

// Default/untouched runners (nobody has picked a value from the dropdown
// yet) always display khai as 0, even if rateDiff is non-zero - this keeps
// the initial "0 0 0 0" screen. Once the user explicitly selects a value
// for a runner (including selecting 0 itself), that runner's khai follows
// computeKhai/rateDiff like normal.
function getKhai(runner, rateDiff) {
  if (!runner.touched) return 0;
  return computeKhai(runner.odds, rateDiff);
}

async function updateRunnerAPI(matchId, runnerId, runnerName, lagai, khai, status = "open", touched = false) {
  try {
    const { data } = await apiClient.post("/manual/update", {
      matchId,
      runnerId,
      runnerName,
      lagai,
      khai,
      status,
      touched,
    });
    return { ok: true, data };
  } catch (err) {
    console.error("Failed to update runner:", err?.response?.data || err.message);
    return { ok: false, error: err?.response?.data?.message || err.message };
  }
}

// Accepts an optional `runners` prop so this can eventually be driven by the
// same live match state (API + SSE) that MatchDetails maintains, instead of
// always starting from a hardcoded two-team default.
// Also accepts an optional `match` prop (the fetched saved match) so the
// default runner names reflect the real home/away teams instead of the
// hardcoded West Indies / Sri Lanka placeholders.
export default function RunnerTable({ rateDiff = 1, runners: runnersProp, onRunnersChange, match }) {
  const { matchId } = useParams();

  const [localRunners, setLocalRunners] = useState(runnersProp ?? buildDefaultRunners(match));
  const [activeIndex, setActiveIndex] = useState(null);
  const [pushError, setPushError] = useState(null);
  const [restoreError, setRestoreError] = useState(null);

  const runners = runnersProp ?? localRunners;

  // Restore the last persisted odds after a page refresh. Previously this
  // component always restarted from buildDefaultRunners(), so the support UI
  // showed 0/0 even though MongoDB still contained the opened rates.
  useEffect(() => {
    if (!matchId || runnersProp) return;
    let cancelled = false;

    const restoreRunners = async () => {
      setRestoreError(null);
      try {
        const { data } = await apiClient.get(`/manual/state/${matchId}`);
        const savedRunners = Array.isArray(data?.data) ? data.data : [];
        if (cancelled || savedRunners.length === 0) return;

        setLocalRunners(
          savedRunners.map((runner, index) => ({
            id: runner.runnerId || `runner_${index + 1}`,
            name: runner.runnerName || (index === 0 ? match?.homeTeam : match?.awayTeam) || `Runner ${index + 1}`,
            odds: Number(runner.lagai) || 0,
            touched: runner.touched === true,
          }))
        );
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to restore runner rates:", error);
          setRestoreError("Saved runner rates could not be restored. Please retry the page.");
        }
      }
    };

    restoreRunners();
    return () => {
      cancelled = true;
    };
  }, [match, matchId, runnersProp]);

  // If `match` arrives after the initial render (e.g. it's still loading
  // when this component mounts), update just the runner names once it's
  // available — odds already entered by the user are left untouched.
  useEffect(() => {
    if (runnersProp) return; // parent owns the runners, don't touch them here
    if (!match) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalRunners((prev) =>
      prev.map((r, i) => {
        const newName = i === 0 ? match.homeTeam : i === 1 ? match.awayTeam : r.name;
        return newName && newName !== r.name ? { ...r, name: newName } : r;
      })
    );
  }, [match, runnersProp]);

  const applyRunners = useCallback(
    (updated) => {
      if (onRunnersChange) {
        onRunnersChange(updated);
      } else {
        setLocalRunners(updated);
      }
    },
    [onRunnersChange]
  );

  const pushUpdates = useCallback(async (updated, status) => {
    setPushError(null);
    const results = await Promise.all(
      updated.map((r) => {
        const lagai = r.odds;
        const khai = getKhai(r, rateDiff);
        return updateRunnerAPI(matchId, r.id, r.name, lagai, khai, status, r.touched === true);
      })
    );
    const failed = results.filter((r) => !r.ok);
    if (failed.length > 0) {
      setPushError(
        `Failed to push ${failed.length} of ${updated.length} rate update(s). Odds shown may be out of sync with the server.`
      );
    }
  }, [matchId, rateDiff]);

  if (!matchId) {
    return (
      <div className="py-8 text-center text-red-600 font-semibold">
        No matchId found in the URL.
      </div>
    );
  }

  const openAllRates = () => {
    // Open Rate must not touch odds — only flip status to "open" and
    // re-push whatever lagai/khai each runner currently has.
    pushUpdates(runners, "open");
  };

  const suspendAllRates = () => {
    // Suspend resets everything back to the untouched/default state, so
    // both runners go back to showing 0 0 (not rateDiff-adjusted).
    const updated = runners.map((r) => ({ ...r, odds: 0, touched: false }));
    applyRunners(updated);
    setActiveIndex(null);
    pushUpdates(updated, "suspend");
  };

  const handleOddsChange = (index, value) => {
    const num = Number(value);
    setActiveIndex(index);

    const updated =
      num === SUSPEND_VALUE
        ? runners.map((r) => ({ ...r, odds: SUSPEND_VALUE, touched: true }))
        : runners.map((r, i) =>
            i === index
              ? { ...r, odds: num, touched: true }
              : { ...r, odds: 0, touched: false }
          );

    applyRunners(updated);
    pushUpdates(updated, "open");
  };

  return (
    <div className="py-8">
      {pushError && (
        <div className="mb-2 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {pushError}
        </div>
      )}

      {restoreError && (
        <div className="mb-2 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
          {restoreError}
        </div>
      )}

      <div className="overflow-hidden rounded border border-gray-300 w-full">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th
                className="py-2 px-6 text-white text-center font-bold text-xs uppercase tracking-wide"
                style={{ background: C.headerBg }}
              >
                RUNNER
              </th>
              <th
                className="py-2 px-4 text-center font-bold text-xs uppercase"
                style={{ background: C.laGaiBg, color: "#1a3a5c" }}
              >
                LAGAI
              </th>
              <th
                className="py-2 px-4 text-center font-bold text-xs uppercase"
                style={{ background: C.khaiBg, color: "#7a1a2e" }}
              >
                KHAI
              </th>
              <th
                className="py-2 px-4 text-center font-bold text-xs uppercase"
                style={{ background: C.actionHeader, color: "#333" }}
              >
                ACTION
              </th>
            </tr>
          </thead>

          <tbody>
            {runners.map((runner, i) => {
              const khai = getKhai(runner, rateDiff);
              const isActive = activeIndex === i;

              return (
                <tr
                  key={runner.id}
                  className={`border-t border-gray-200 transition-colors duration-150 ${
                    isActive ? "bg-yellow-50" : "bg-white hover:bg-gray-50"
                  }`}
                >
                  <td className="py-2 px-6 text-center text-gray-800 font-bold">
                    {runner.name}
                  </td>

                  {/* Lagai */}
                  <td
                    className="py-2 px-4 text-center font-bold relative"
                    style={{ background: C.laGaiCell }}
                  >
                    <select
                      aria-label={`${runner.name} lagai odds`}
                      value={runner.odds}
                      onChange={(e) => handleOddsChange(i, e.target.value)}
                      className="w-full border border-gray-300 bg-white p-1 outline-none rounded text-gray-900 font-bold"
                      style={{ cursor: "pointer" }}
                    >
                      {ODDS_OPTIONS.map((num) => (
                        <option key={num} value={num}>{num}</option>
                      ))}
                    </select>
                  </td>

                  {/* Khai */}
                  <td
                    className="py-2 px-4 text-center font-bold"
                    style={{ background: C.khaiCell }}
                  >
                    <span className="text-gray-900">{khai}</span>
                  </td>

                  {/* Action */}
                  <td className="py-2 px-4 text-center">
                    {i === 0 ? (
                      <button
                        onClick={openAllRates}
                        className="text-white font-bold rounded px-3 py-2 transition-all duration-200 hover:scale-105 hover:brightness-110 active:scale-95 active:brightness-90 shadow-sm hover:shadow-md"
                        style={{ background: C.openBtn, cursor: "pointer" }}
                      >
                        Open Rate
                      </button>
                    ) : (
                      <button
                        onClick={suspendAllRates}
                        className="text-white font-bold rounded px-3 py-2 transition-all duration-200 hover:scale-105 hover:brightness-110 active:scale-95 active:brightness-90 shadow-sm hover:shadow-md"
                        style={{ background: C.suspendBtn, cursor: "pointer" }}
                      >
                        Suspend Rate
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
