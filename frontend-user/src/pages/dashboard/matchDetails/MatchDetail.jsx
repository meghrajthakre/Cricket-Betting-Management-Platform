import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { getManualState, getManualSettings, getSSEUrl } from "../../../api/userService";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

// ─── Mock data ──────────────────────────────────────────────────────────────
const MOCK_DATA = {
  match: {
    team1: "England Women",
    team2: "India Women",
    score: "47/1 (7.1 Ovs)",
    toss: "England Women opt to bat",
    status: "BET OPEN",
  },
  recentBalls: ["4", "1", "4", "1"],
  thisOver: { runs: 12, balls: "Over 8 -", dot: "•", extraRuns: 0 },
  bookmaker: { min: 50, max: 500000 },
  sessions: [
    { name: "8 Over ENGW", no: { rate: 53, size: 1.00 }, yes: { rate: 54, size: 1.00 } },
    { name: "10 Over ENGW", no: { rate: 69, size: 1.00 }, yes: { rate: 70, size: 1.00 } },
    { name: "20 Over ENGW", no: { rate: 159, size: 1.00 }, yes: { rate: 161, size: 1.00 } },
    { name: "D Wyatt-Hodge Runs", no: { rate: 47, size: 1.10 }, yes: { rate: 47, size: 0.90 } },
    { name: "A Jones Runs", no: { rate: 30, size: 1.10 }, yes: { rate: 30, size: 0.90 } },
    { name: "1st 2 Wkt ENGW", no: { rate: 69, size: 1.10 }, yes: { rate: 69, size: 0.90 } },
  ],
  evenOdd: {
    market: "England Women 10 Over Last Digit Even Odd",
    runners: [
      { name: "Even", rate: 0.97, position: 0 },
      { name: "Odd", rate: 0.97, position: 0 },
    ],
  },
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function BallChip({ val }) {
  const isFour = val === "4";
  const isSix = val === "6";
  const isDot = val === "0" || val === "•";
  const isWicket = val === "W";

  const bg = isWicket ? "bg-red-600" : isFour || isSix ? "bg-[#4B75B8]" : isDot ? "bg-gray-400" : "bg-[#4B75B8]";

  return (
    <span
      className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-bold font-rajdhani ${bg}`}
    >
      {val}
    </span>
  );
}

function OddsBtn({ value, type, suspended, highlight }) {
  const isLagai = type === "lagai";
  const bg = isLagai ? "bg-[#a8cce8]" : "bg-[#f5c99a]";
  
  const highlightClass = highlight ? 'ring-2 ring-yellow-400 ring-opacity-75 animate-pulse' : '';

  return (
    <div className={`relative ${bg} ${highlightClass} rounded h-9 w-full flex items-center justify-center text-sm font-semibold text-[#1A2B3C] transition-all duration-300`}>
      {value ?? "-"}
      {suspended && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded">
          <span className="text-white text-[10px] font-bold tracking-wide">SUSPENDED</span>
        </div>
      )}
    </div>
  );
}

function SessionRow({ session, onBet, sessionLocked }) {
  const handleBet = (type, rate) => {
    if (sessionLocked) return;
    if (onBet) {
      onBet(session.name, type, rate);
    } else {
      console.log(`Bet placed: ${session.name} - ${type} @ ${rate}`);
    }
  };

  return (
    <tr className="border-b border-[#CDD9E5] last:border-0">
      <td className="py-2 px-3 text-sm font-semibold text-[#1A2B3C] font-nunito w-[45%]">
        {session.name}
      </td>
      <td className="py-2 px-1 w-[22%] relative">
        <button
          onClick={() => handleBet("no", session.no.rate)}
          disabled={sessionLocked}
          className="w-full bg-[#a8cce8] hover:bg-[#7fb3d9] transition-colors rounded text-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="text-base font-bold text-[#1A2B3C] font-rajdhani leading-tight pt-1">
            {session.no.rate}
          </div>
          <div className="text-xs text-[#2B4A7A] pb-1">{session.no.size.toFixed(2)}</div>
        </button>
      </td>
      <td className="py-2 px-1 w-[22%] relative">
        <button
          onClick={() => handleBet("yes", session.yes.rate)}
          disabled={sessionLocked}
          className="w-full bg-[#f5c99a] hover:bg-[#f0b87a] transition-colors rounded text-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="text-base font-bold text-[#1A2B3C] font-rajdhani leading-tight pt-1">
            {session.yes.rate}
          </div>
          <div className="text-xs text-[#7A4A2B] pb-1">{session.yes.size.toFixed(2)}</div>
        </button>
      </td>
      <td className="py-2 px-2 w-[11%]">
        <div className="flex gap-1 justify-center">
          <button className="text-[#4B75B8] hover:text-[#1E3A5F]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
            </svg>
          </button>
          <button className="text-[#4B75B8] hover:text-[#1E3A5F]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function MatchDetails() {
  const { matchId } = useParams();

  const [runners, setRunners] = useState([]);
  const [settings, setSettings] = useState({
    rateDiff: 1,
    betLock: false,
    sessionLock: false,
    mode: "Lagai",
    marketStatus: "OPEN",
  });

  const [highlightedOdds, setHighlightedOdds] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sseConnected, setSseConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const esRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const highlightTimeoutRef = useRef(null);

  // Function to fetch latest data
  const fetchLatestData = useCallback(async () => {
    if (!matchId) return;
    
    try {
      const [stateRes, settingsRes] = await Promise.all([
        getManualState(matchId).catch(err => {
          console.error("Failed to load state:", err);
          return null;
        }),
        getManualSettings(matchId).catch(err => {
          console.error("Failed to load settings:", err);
          return null;
        })
      ]);

      if (stateRes?.data) {
        const data = stateRes.data;
        setRunners(Array.isArray(data) ? data : []);
      }

      if (settingsRes?.data) {
        setSettings(prev => ({ ...prev, ...settingsRes.data }));
      }
    } catch (e) {
      console.error("Failed to fetch latest data:", e);
    }
  }, [matchId]);

  useEffect(() => {
    if (!matchId) {
      setLoading(false);
      setError("No match ID provided");
      return;
    }

    let cancelled = false;

    async function loadInitialData() {
      setLoading(true);
      setError(null);
      try {
        await fetchLatestData();
      } catch (e) {
        console.error("Failed to load initial data:", e);
        if (!cancelled) {
          setError(e?.response?.data?.message || e.message || "Failed to load data");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadInitialData();

    // ── SSE Connection ──────────────────────────────────────────────────────
    const connectSSE = () => {
      try {
        const sseUrl = getSSEUrl(matchId);

        const es = new EventSource(sseUrl, {
          withCredentials: true,
        });
        esRef.current = es;

        es.onopen = () => {
          setSseConnected(true);
          setReconnectAttempts(0);
          setError(null);
        };

        es.onmessage = (evt) => {
          try {
            const parsed = JSON.parse(evt.data);
            console.log("SSE message received:", parsed);

            // Handle RUNNER_UPDATED
            if (parsed.type === "RUNNER_UPDATED" && parsed.payload) {
              const { runnerId, runnerName, lagai, khai, status } = parsed.payload;
              
              // Highlight the updated odds
              setHighlightedOdds(prev => ({
                ...prev,
                [runnerId]: { lagai: true, khai: true }
              }));
              
              // Clear highlight after 1.5 seconds
              if (highlightTimeoutRef.current) {
                clearTimeout(highlightTimeoutRef.current);
              }
              highlightTimeoutRef.current = setTimeout(() => {
                setHighlightedOdds({});
              }, 1500);

              setRunners((prev) => {
                const idx = prev.findIndex((r) => r.runnerId === runnerId);
                if (idx === -1) {
                  return [...prev, { runnerId, runnerName, lagai, khai, status }];
                }
                const next = [...prev];
                next[idx] = { ...next[idx], runnerName, lagai, khai, status };
                return next;
              });
            }

            // Handle SETTINGS_UPDATED
            if (parsed.type === "SETTINGS_UPDATED" && parsed.payload) {
              console.log("Settings update received via SSE:", parsed.payload);
              setSettings((prev) => {
                const newSettings = { ...prev, ...parsed.payload };
                console.log("Updated settings:", newSettings);
                return newSettings;
              });
            }

            // Handle full state update (if your backend sends this)
            if (parsed.type === "STATE_UPDATED" && parsed.payload) {
              console.log("Full state update received:", parsed.payload);
              if (parsed.payload.runners) {
                setRunners(parsed.payload.runners);
              }
              if (parsed.payload.settings) {
                setSettings(prev => ({ ...prev, ...parsed.payload.settings }));
              }
            }
          } catch (err) {
            console.error("Failed to parse SSE event:", err);
          }
        };

        es.onerror = (err) => {
          console.error("SSE connection error:", err);
          setSseConnected(false);

          if (esRef.current) {
            esRef.current.close();
          }

          const maxAttempts = 5;
          const baseDelay = 2000;
          const currentAttempt = reconnectAttempts + 1;

          if (currentAttempt <= maxAttempts) {
            const delay = baseDelay * Math.pow(1.5, currentAttempt - 1);
            console.log(`Reconnecting in ${delay}ms (attempt ${currentAttempt}/${maxAttempts})`);

            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
            }

            reconnectTimeoutRef.current = setTimeout(() => {
              if (!cancelled) {
                setReconnectAttempts(currentAttempt);
                connectSSE();
              }
            }, delay);
          } else {
            setError("Unable to establish live connection. Please refresh the page.");
          }
        };
      } catch (err) {
        console.error("Failed to establish SSE connection:", err);
        setError("Failed to connect to live updates");
      }
    };

    connectSSE();

    // Polling fallback: fetch data every 5 seconds if SSE fails
    const pollInterval = setInterval(() => {
      if (!sseConnected && !cancelled) {
        console.log("Polling for updates...");
        fetchLatestData();
      }
    }, 5000);

    return () => {
      cancelled = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
      if (esRef.current) {
        esRef.current.close();
      }
      clearInterval(pollInterval);
    };
  }, [matchId, fetchLatestData, sseConnected, reconnectAttempts]);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handlePlaceBet = (sessionName, type, rate) => {
    if (settings.sessionLock) {
      console.log("Session is locked, bet blocked:", sessionName);
      return;
    }
    console.log(`Bet placed: ${sessionName} - ${type} @ ${rate}`);
    // Implement your bet placement logic here
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  if (!matchId) {
    return (
      <div className="flex items-center justify-center h-40 bg-[#E8EDF3]">
        <p className="text-[#d23131] font-semibold">No matchId found in the URL.</p>
      </div>
    );
  }

  if (loading && runners.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 bg-[#E8EDF3]">
        <div className="w-8 h-8 border-4 border-[#4B75B8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-40 bg-[#E8EDF3] gap-4">
        <p className="text-[#d23131] font-semibold">Error: {error}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-[#4B75B8] text-white px-4 py-2 rounded hover:bg-[#1E3A5F] transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const { match, recentBalls, thisOver, bookmaker, sessions, evenOdd } = MOCK_DATA;

  return (
    <div className="bg-[#E8EDF3] min-h-screen">
      <div className="max-w-lg mx-auto">
        {/* SSE Connection Status */}
        <div className="text-xs text-center py-1 flex items-center justify-center gap-2">
          {sseConnected ? (
            <span className="text-green-600 flex items-center gap-1">
              <span className="inline-block w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
              Live
            </span>
          ) : (
            <span className="text-yellow-600 flex items-center gap-1">
              <span className="inline-block w-2 h-2 bg-yellow-600 rounded-full animate-pulse"></span>
              Connecting...
            </span>
          )}
          <span className="text-gray-400">|</span>
          <span className="text-gray-500">Match ID: {matchId.slice(0, 8)}</span>
          <button
            onClick={fetchLatestData}
            className="ml-2 text-blue-600 hover:text-blue-800 text-xs underline"
          >
            Refresh
          </button>
        </div>

        {/* ── Match Header ────────────────────────────────────────────────── */}
        <div className="bg-[#1E3A5F] flex items-center justify-between px-3 py-2 rounded-t">
          <div className="flex items-center gap-3">
            <svg width="36" height="36" viewBox="0 0 40 40" fill="none" className="shrink-0">
              <circle cx="20" cy="20" r="18" fill="#2E5080"/>
              <line x1="10" y1="30" x2="30" y2="10" stroke="#90B4D4" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="28" cy="12" r="4" fill="#D6E4F5" opacity="0.9"/>
            </svg>
            <div>
              <p className="text-white text-sm font-semibold font-rajdhani leading-tight">
                {match.team1} {match.score}
              </p>
              <p className="text-[#D6E4F5] text-xs font-rajdhani">{match.team2}</p>
              <p className="text-[#90B4D4] text-xs">{match.toss}</p>
            </div>
          </div>
          <div className="bg-[#4B75B8] text-white text-xs font-bold px-2 py-1 rounded font-rajdhani tracking-wide text-center">
            {settings.betLock ? (
              <>BET<br/>LOCKED</>
            ) : (
              <>{settings.marketStatus === "OPEN" ? <>BET<br/>OPEN</> : <>{settings.marketStatus}</>}</>
            )}
          </div>
        </div>

        {/* ── Recent Balls ─────────────────────────────────────────────────── */}
        <div className="bg-[#3A5F9A] flex items-center gap-2 px-3 py-2 flex-wrap">
          {recentBalls.map((b, i) => (
            <BallChip key={i} val={b} />
          ))}
          <span className="text-white text-xs font-bold mx-1">-</span>
          <span className="text-white text-sm font-bold font-rajdhani">{thisOver.runs} Runs</span>
          <span className="text-[#D6E4F5] text-xs ml-1">| {thisOver.balls}</span>
          <BallChip val={thisOver.dot} />
          <span className="text-white text-xs font-bold mx-1">-</span>
          <span className="text-white text-sm font-bold font-rajdhani">{thisOver.extraRuns} Runs</span>
        </div>

        {/* ── Bookmaker Market ─────────────────────────────────────────────── */}
        <div className="bg-white mt-2 rounded shadow-sm overflow-hidden">
          <div className="bg-[#E8EDF3] px-3 py-2 text-center">
            <p className="text-sm font-semibold text-[#1E3A5F]">Market : Bookmaker</p>
            <div className="inline-block bg-[#1E3A5F] text-white text-xs px-3 py-0.5 rounded mt-0.5 font-rajdhani">
              Min : {bookmaker.min} | Max : {bookmaker.max.toLocaleString()}
            </div>
          </div>

          <div className="grid grid-cols-4 bg-[#1E3A5F] text-white text-xs font-bold font-rajdhani px-3 py-1.5 tracking-wider">
            <div>RUNNER</div>
            <div className="text-center">LAGAI</div>
            <div className="text-center">KHAI</div>
            <div className="text-right">POSITION</div>
          </div>

          {runners.length === 0 ? (
            <div className="px-3 py-3 text-sm text-gray-500 text-center">
              No odds published yet for this match.
            </div>
          ) : (
            runners.map((r, index) => {
              const isSuspended = r.status === "suspend" || settings.betLock;
              const highlight = highlightedOdds[r.runnerId] || {};
              
              return (
                <div key={r.runnerId || r.runnerName || index} className="grid grid-cols-4 items-center px-3 py-2 border-b border-[#CDD9E5] last:border-0">
                  <div className="text-sm font-semibold text-[#1A2B3C]">{r.runnerName}</div>
                  <div className="px-1">
                    <OddsBtn 
                      value={r.lagai} 
                      type="lagai" 
                      suspended={isSuspended}
                      highlight={highlight.lagai}
                    />
                  </div>
                  <div className="px-1">
                    <OddsBtn 
                      value={r.khai} 
                      type="khai" 
                      suspended={isSuspended}
                      highlight={highlight.khai}
                    />
                  </div>
                  <div className="text-right text-sm font-semibold text-[#1A2B3C]">0.00</div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Session Market ───────────────────────────────────────────────── */}
        <div className="bg-white mt-2 rounded shadow-sm overflow-hidden">
          <div className="grid grid-cols-[1fr_auto] bg-[#4B75B8] px-3 py-2">
            <span className="text-white text-sm font-bold font-rajdhani tracking-wider">SESSION</span>
            <span className="text-white text-sm font-bold font-rajdhani">0</span>
          </div>

          <div className="grid grid-cols-[45%_22%_22%_11%] bg-[#1E3A5F] text-white text-xs font-bold font-rajdhani px-3 py-1 tracking-wider">
            <div>SESSION</div>
            <div className="text-center">
              <div>No</div>
              <div className="font-normal opacity-70">RATE</div>
            </div>
            <div className="text-center">
              <div>Yes</div>
              <div className="font-normal opacity-70">RATE</div>
            </div>
            <div></div>
          </div>

          {settings.sessionLock && (
            <div className="bg-black/5 px-3 py-1 text-xs font-semibold text-[#7A2B2B] text-center">
              Session betting is currently locked
            </div>
          )}

          <table className="w-full">
            <tbody>
              {sessions.map((s, i) => (
                <SessionRow
                  key={i}
                  session={s}
                  onBet={handlePlaceBet}
                  sessionLocked={settings.sessionLock}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Even / Odd Market ────────────────────────────────────────────── */}
        <div className="bg-white mt-2 rounded shadow-sm overflow-hidden mb-4">
          <div className="bg-[#4B75B8] px-3 py-2">
            <p className="text-white text-sm font-semibold font-rajdhani">
              Market : {evenOdd.market}
            </p>
          </div>

          <div className="grid grid-cols-3 bg-[#1E3A5F] text-white text-xs font-bold font-rajdhani px-3 py-1.5 tracking-wider">
            <div>RUNNER</div>
            <div className="text-center">RATE</div>
            <div className="text-right">POSITION</div>
          </div>

          {evenOdd.runners.map((r, i) => (
            <div key={i} className="grid grid-cols-3 items-center px-3 py-2 border-b border-[#CDD9E5] last:border-0">
              <div
                className={`text-sm font-semibold rounded px-2 py-0.5 w-fit ${
                  r.name === "Even" ? "bg-[#5aab6e] text-white" : "text-[#1A2B3C]"
                }`}
              >
                {r.name}
              </div>
              <div className="flex justify-center">
                <button className="bg-[#a8cce8] hover:bg-[#7fb3d9] transition-colors rounded px-4 py-1 text-sm font-bold text-[#1A2B3C] font-rajdhani">
                  {r.rate.toFixed(2)}
                </button>
              </div>
              <div className="text-right text-sm font-semibold text-[#1A2B3C]">{r.position}</div>
            </div>
          ))}
        </div>

        {/* Debug: Show current settings */}
        <div className="bg-gray-100 p-2 mb-4 rounded text-xs">
          <details>
            <summary className="font-bold cursor-pointer">Settings Debug</summary>
            <pre className="mt-1 overflow-auto">
              {JSON.stringify(settings, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    </div>
  );
}