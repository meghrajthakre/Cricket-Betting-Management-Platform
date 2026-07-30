import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import api from "../../constants/api";

const REFRESH_INTERVAL = 3000;
const RECENT_MATCHES_REFRESH_INTERVAL = 30000;

const formatNumber = (value) => Number(value || 0).toLocaleString("en-IN");

function ProfitLoss({ value }) {
  const amount = Number(value || 0);
  return (
    <span className={amount < 0 ? "font-semibold text-red-600" : "font-semibold text-green-600"}>
      {formatNumber(amount)}
    </span>
  );
}

function ScorePanel({ match, score }) {
  const balls = Array.isArray(score?.balls) ? score.balls.slice(-6) : [];
  const battingTeam = score?.currentInnings === 2
    ? score?.secondBattingTeam
    : score?.firstBattingTeam;

  return (
    <section className="overflow-hidden rounded-lg border border-(--color-border) bg-white shadow-sm">
      <div className="bg-(--color-banner) px-4 py-2 text-center text-white">
        <p className="text-base font-bold">
          CR Over - {balls.map((ball) => ball.isWicket ? "W" : ball.runs).join("  ") || "0"}
        </p>
      </div>

      <div className="grid min-h-12 grid-cols-[40%_20%_40%] border-b border-gray-300 text-center font-bold">
        <div className="flex min-w-0 items-center justify-center bg-[#acd0df] px-1 py-2 text-[10px] sm:px-3 sm:text-sm">
          {battingTeam || match?.homeTeam || "Team 1"} {Number(score?.runs || 0)}-{Number(score?.wickets || 0)} ({score?.overs || 0})
        </div>
        <div className="flex min-w-0 items-center justify-center overflow-hidden bg-(--color-primary) px-1 py-2 text-sm text-white sm:px-3 sm:text-xl">
          {score?.status || "LIVE"}
        </div>
        <div className="flex min-w-0 items-center justify-center bg-[#acd0df] px-1 py-2 text-[10px] sm:px-3 sm:text-sm">
          {score?.currentInnings === 2
            ? score?.firstBattingTeam
            : score?.secondBattingTeam || match?.awayTeam || "Team 2"}
        </div>
      </div>
    </section>
  );
}

function OddsTable({ runners, positions }) {
  return (
    <section className="overflow-hidden rounded-lg border border-(--color-border) bg-white shadow-sm">
      <table className="w-full table-fixed border-collapse text-[10px] sm:text-sm">
        <thead>
          <tr>
            <th className="w-[30%] bg-(--color-primary) px-1 py-2 font-semibold text-white sm:px-4 sm:py-3">RUNNER</th>
            <th className="w-[22%] bg-blue-200 px-1 py-2 text-center font-semibold text-gray-800 sm:px-4 sm:py-3">LAGAI</th>
            <th className="w-[22%] bg-pink-200 px-1 py-2 text-center font-semibold text-gray-800 sm:px-4 sm:py-3">KHAI</th>
            <th className="w-[26%] bg-(--color-primary) px-1 py-2 text-center font-semibold text-white sm:px-4 sm:py-3">+/-</th>
          </tr>
        </thead>
        <tbody>
          {runners.map((runner) => (
            <tr key={runner.runnerId}>
              <td className="truncate border border-gray-200 px-2 py-3 font-semibold text-gray-800 sm:px-4 sm:py-4" title={runner.runnerName}>
                {runner.runnerName}
              </td>
              <td className="border border-gray-200 bg-blue-50 px-1 py-3 text-center font-bold sm:px-4 sm:py-4">
                {runner.lagai || "-"}
              </td>
              <td className="border border-gray-200 bg-pink-50 px-1 py-3 text-center font-bold sm:px-4 sm:py-4">
                {runner.khai || "-"}
              </td>
              <td className="border border-gray-200 px-1 py-3 text-center sm:px-4 sm:py-4">
                <ProfitLoss value={positions[runner.runnerId]} />
              </td>
            </tr>
          ))}
          {!runners.length && (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                Match odds abhi available nahi hain.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}

function buildSessionLadder(session, bets) {
  const pendingBets = bets.filter(
    (bet) => bet.marketType === "session" && bet.marketId === session.id && bet.status === "pending"
  );
  const lines = pendingBets
    .map((bet) => Number(bet.sessionRun ?? bet.rate))
    .filter(Number.isFinite);
  const quoteLines = [Number(session.noRun), Number(session.yesRun)].filter(Number.isFinite);
  const allLines = [...lines, ...quoteLines];
  const minimum = allLines.length ? Math.min(...allLines) : 0;
  const maximum = allLines.length ? Math.max(...allLines) : 10;
  const start = Math.max(0, Math.floor(minimum) - 5);
  const end = Math.min(start + 60, Math.ceil(maximum) + 10);

  return Array.from({ length: end - start + 1 }, (_, index) => {
    const run = start + index;
    const position = pendingBets.reduce((total, bet) => {
      const line = Number(bet.sessionRun ?? bet.rate);
      const userWon = bet.type === "yes" ? run >= line : run < line;
      return total + (userWon ? -Number(bet.profit || 0) : Number(bet.loss || 0));
    }, 0);
    return { run, position: Number(position.toFixed(2)) };
  });
}

function SessionTable({ sessions, bets }) {
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const selectedSession = sessions.find((session) => session.id === selectedSessionId);
  const selectedSessionBets = selectedSession
    ? bets.filter(
        (bet) =>
          bet.marketType === "session" &&
          bet.marketId === selectedSession.id &&
          bet.status === "pending"
      )
    : [];
  const selectedLadder = selectedSessionBets.length
    ? buildSessionLadder(selectedSession, bets)
    : [];

  return (
    <section className="overflow-hidden rounded-lg border border-(--color-border) bg-white shadow-sm">
      <div className="bg-(--color-banner) px-4 py-2 text-center text-sm font-bold text-white">
        Running Session
      </div>
      <div className="overflow-hidden">
        <table className="w-full table-fixed border-collapse text-[10px] sm:text-sm">
          <thead>
            <tr>
              <th className="w-[40%] bg-(--color-primary) px-2 py-2 text-left font-semibold text-white sm:px-4 sm:py-3">SESSION</th>
              <th className="w-[20%] bg-blue-200 px-1 py-2 text-center font-semibold text-gray-800 sm:px-4 sm:py-3">NO RUN</th>
              <th className="w-[20%] bg-pink-200 px-1 py-2 text-center font-semibold text-gray-800 sm:px-4 sm:py-3">YES RUN</th>
              <th className="w-[20%] bg-(--color-primary) px-1 py-2 text-center font-semibold text-white sm:px-4 sm:py-3">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => {
              const selected = selectedSessionId === session.id;
              const totalAmount = bets
                .filter((bet) => bet.marketType === "session" && bet.marketId === session.id)
                .reduce((total, bet) => total + Number(bet.amount || 0), 0);
              const hasPendingBets = bets.some(
                (bet) =>
                  bet.marketType === "session" &&
                  bet.marketId === session.id &&
                  bet.status === "pending"
              );
              return (
                <tr
                  key={session.id}
                  onClick={() => {
                    if (!hasPendingBets) {
                      toast.error("Is session par koi bet nahi lagi hai.");
                      return;
                    }
                    setSelectedSessionId(selected ? null : session.id);
                  }}
                  className={`cursor-pointer transition-colors ${
                    selected ? "bg-blue-50" : "hover:bg-blue-50"
                  }`}
                >
                  <td className="truncate border border-gray-200 px-2 py-3 font-semibold text-(--color-primary) sm:px-4" title={session.sessionName}>
                    {session.sessionName}
                  </td>
                  <td className="border border-gray-200 bg-blue-100 px-1 py-3 text-center sm:px-4">
                    <div className="font-bold">{session.noRun}</div>
                    <div className="text-xs font-semibold">{session.noRate}</div>
                  </td>
                  <td className="border border-gray-200 bg-pink-200 px-1 py-3 text-center sm:px-4">
                    <div className="font-bold">{session.yesRun}</div>
                    <div className="text-xs font-semibold">{session.yesRate}</div>
                  </td>
                  <td className="border border-gray-200 px-1 py-3 text-center font-bold text-(--color-primary) sm:px-4">
                    {formatNumber(totalAmount)}
                  </td>
                </tr>
              );
            })}
            {!sessions.length && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  Running session abhi available nahi hai.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {selectedSession && (
        <div className="border-t-4 border-(--color-bg-main) bg-[#f8fafc] p-2 sm:p-4">
          <div className="mb-2 bg-(--color-primary) px-3 py-2 text-center text-xs font-bold text-white sm:text-sm">
            {selectedSession.sessionName} - Live Position
          </div>
          <table className="w-full table-fixed border-collapse text-xs sm:text-sm">
              <thead>
                <tr>
                  <th className="bg-[#4c89a8] px-3 py-2 text-center text-white">RUN</th>
                  <th className="bg-[#4c89a8] px-3 py-2 text-center text-white">LIVE POSITION</th>
                </tr>
              </thead>
              <tbody>
                {selectedLadder.map((row) => (
                  <tr key={row.run}>
                    <td className="border-2 border-gray-200 bg-white px-3 py-3 text-center font-semibold text-(--color-primary)">
                      {row.run}
                    </td>
                    <td className="border-2 border-gray-200 bg-white px-3 py-3 text-center">
                      <ProfitLoss value={row.position} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
      )}
    </section>
  );
}

function DeclaredSessionsTable({ sessions, bets }) {
  const rows = sessions.map((session) => {
    const sessionBets = bets.filter(
      (bet) => bet.marketType === "session" && bet.marketId === session.id
    );
    const plusMinus = sessionBets.reduce((total, bet) => {
      if (bet.status === "won") return total - Number(bet.profit || 0);
      if (bet.status === "lost") return total + Number(bet.loss || 0);
      return total;
    }, 0);
    return { ...session, plusMinus: Number(plusMinus.toFixed(2)) };
  });
  const total = rows.reduce((sum, session) => sum + session.plusMinus, 0);

  if (!rows.length) return null;

  return (
    <section className="overflow-hidden rounded-lg border border-(--color-border) bg-white shadow-sm">
      <div className="bg-(--color-banner) px-4 py-2 text-center text-sm font-bold text-white">
        Declared Session
      </div>
      <div className="overflow-hidden">
        <table className="w-full table-fixed border-collapse text-[9px] sm:text-sm">
          <thead>
            <tr>
              <th className="w-[34%] bg-(--color-primary) px-1 py-3 text-center font-semibold text-white sm:px-3">SESSION</th>
              <th className="w-[18%] bg-(--color-primary) px-1 py-3 text-center font-semibold text-white sm:px-3">RUN</th>
              <th className="w-[20%] bg-(--color-primary) px-1 py-3 text-center font-semibold text-white sm:px-3">+/-</th>
              <th className="w-[28%] bg-(--color-primary) px-1 py-3 text-center font-semibold text-white sm:px-3">SETTLED TIME</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((session) => (
              <tr key={session.id}>
                <td className="break-words border-2 border-gray-200 px-1 py-3 text-center font-semibold text-(--color-primary) sm:px-3">
                  {session.sessionName}
                </td>
                <td className="border-2 border-gray-200 px-1 py-3 text-center font-semibold sm:px-3">
                  {session.resultRun ?? "-"}
                </td>
                <td className="border-2 border-gray-200 px-1 py-3 text-center sm:px-3">
                  <ProfitLoss value={session.plusMinus} />
                </td>
                <td className="break-words border-2 border-gray-200 px-1 py-3 text-center text-gray-600 sm:px-3">
                  {session.settledAt
                    ? new Date(session.settledAt).toLocaleString("en-IN")
                    : "-"}
                </td>
              </tr>
            ))}
            <tr className="bg-gray-50">
              <td className="border-2 border-gray-200 px-3 py-3" />
              <td className="border-2 border-gray-200 px-3 py-3 text-center font-bold text-(--color-primary)">
                Total
              </td>
              <td className="border-2 border-gray-200 px-3 py-3 text-center">
                <ProfitLoss value={Number(total.toFixed(2))} />
              </td>
              <td className="border-2 border-gray-200 px-3 py-3" />
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RecentLiveMatches({ matches, currentMatchId, onOpen }) {
  const recentMatches = matches
    .filter((item) => item.matchId && item.matchId !== currentMatchId)
    .slice(0, 6);

  return (
    <section className="overflow-hidden rounded-lg border border-(--color-border) bg-white shadow-sm">
      <div className="bg-(--color-banner) px-4 py-2 text-center text-sm font-bold text-white">
        Recent Live Matches
      </div>
      {recentMatches.length ? (
        <div className="divide-y divide-gray-200">
          {recentMatches.map((item) => (
            <button
              key={item.matchId}
              type="button"
              onClick={() => onOpen(item.matchId)}
              className="grid w-full cursor-pointer grid-cols-[1fr_auto] items-center gap-3 px-3 py-3 text-left hover:bg-blue-50 sm:px-5"
            >
              <span className="min-w-0">
                <span className="block truncate text-xs font-bold text-gray-900 sm:text-sm">
                  {item.homeTeam} vs {item.awayTeam}
                </span>
                <span className="mt-0.5 block truncate text-[10px] text-gray-500 sm:text-xs">
                  {item.sportTitle || item.sportKey || "Cricket"}
                </span>
              </span>
              <span className={`whitespace-nowrap text-[10px] font-bold uppercase sm:text-xs ${
                item.isLive ? "text-green-600" : "text-gray-500"
              }`}>
                {item.isLive ? "Live" : "Recent"}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="px-4 py-6 text-center text-xs text-gray-400">
          Abhi koi aur live match available nahi hai.
        </p>
      )}
    </section>
  );
}

function BetsTable({ bets }) {
  return (
    <section className="overflow-hidden rounded-lg border border-(--color-border) bg-white shadow-sm">
      <div className="border-b border-gray-200 px-5 py-4">
        <h2 className="font-bold text-gray-900">Live Bets ({bets.length})</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Team / Session</th>
              <th className="px-4 py-3">Market</th>
              <th className="px-4 py-3">Bet</th>
              <th className="px-4 py-3 text-right">Rate</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 text-right">Win</th>
              <th className="px-4 py-3 text-right">Loss</th>
              <th className="px-4 py-3">Time</th>
            </tr>
          </thead>
          <tbody>
            {bets.map((bet) => (
              <tr key={bet._id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-semibold text-gray-900">
                  {bet.userId?.username || bet.userId?.firstName || "User"}
                </td>
                <td className="px-4 py-3 font-semibold text-[#356f8d]">
                  {bet.selectionName || bet.marketId || "-"}
                </td>
                <td className="px-4 py-3 capitalize text-gray-600">{bet.marketType}</td>
                <td className="px-4 py-3">
                  <span className={`font-bold ${bet.type === "yes" ? "text-blue-700" : "text-pink-700"}`}>
                    {bet.type === "yes" ? "LAGAI" : "KHAI"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">{bet.rate}</td>
                <td className="px-4 py-3 text-right font-semibold">{formatNumber(bet.amount)}</td>
                <td className="px-4 py-3 text-right text-green-600">{formatNumber(bet.profit)}</td>
                <td className="px-4 py-3 text-right text-red-600">{formatNumber(bet.loss)}</td>
                <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                  {new Date(bet.createdAt).toLocaleString("en-IN")}
                </td>
              </tr>
            ))}
            {!bets.length && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-gray-400">
                  Is match par abhi koi bet nahi lagi hai.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function MatchLiveReport() {
  const navigate = useNavigate();
  const { id: matchId } = useParams();
  const [match, setMatch] = useState(null);
  const [score, setScore] = useState(null);
  const [runners, setRunners] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [liveMatches, setLiveMatches] = useState([]);
  const [bets, setBets] = useState([]);
  const [showMatchBets, setShowMatchBets] = useState(false);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);

  const loadReport = useCallback(async ({ silent = false } = {}) => {
    if (!matchId) return;
    if (!silent) setRefreshing(true);

    const [matchResult, scoreResult, runnersResult, sessionsResult, betsResult] = await Promise.allSettled([
      api.get(`/matches/saved/${encodeURIComponent(matchId)}`),
      api.get(`/manual/score/${encodeURIComponent(matchId)}`),
      api.get(`/manual/state/${encodeURIComponent(matchId)}`),
      api.get(`/session/${encodeURIComponent(matchId)}`),
      api.get("/bet/match", { params: { matchId } }),
    ]);

    if (matchResult.status === "fulfilled") setMatch(matchResult.value.data?.data || null);
    if (scoreResult.status === "fulfilled") setScore(scoreResult.value.data?.data || null);
    if (runnersResult.status === "fulfilled") {
      setRunners(Array.isArray(runnersResult.value.data?.data) ? runnersResult.value.data.data : []);
    }
    if (sessionsResult.status === "fulfilled") {
      const rows = sessionsResult.value.data?.data?.sessions;
      setSessions(Array.isArray(rows) ? rows : []);
    }
    if (betsResult.status === "fulfilled") {
      setBets(Array.isArray(betsResult.value.data?.data) ? betsResult.value.data.data : []);
      setError("");
    } else {
      setError(
        betsResult.reason?.response?.data?.error ||
        betsResult.reason?.message ||
        "Live bets load nahi ho paaye."
      );
    }
    setUpdatedAt(new Date());
    if (!silent) setRefreshing(false);
  }, [matchId]);

  const loadRecentMatches = useCallback(async () => {
    const [liveResult, savedResult] = await Promise.allSettled([
      api.get("/cricket/live"),
      api.get("/matches/saved"),
    ]);
    const live = liveResult.status === "fulfilled" && Array.isArray(liveResult.value.data?.matches)
      ? liveResult.value.data.matches.map((item) => ({ ...item, isLive: true }))
      : [];
    const saved = savedResult.status === "fulfilled" && Array.isArray(savedResult.value.data?.data)
      ? savedResult.value.data.data.map((item) => ({ ...item, isLive: false }))
      : [];
    const merged = new Map(saved.map((item) => [item.matchId, item]));
    live.forEach((item) => merged.set(item.matchId, item));
    setLiveMatches(
      [...merged.values()].sort(
        (a, b) => new Date(b.commenceTime || 0) - new Date(a.commenceTime || 0)
      )
    );
  }, []);

  useEffect(() => {
    const initialLoad = setTimeout(loadReport, 0);
    const interval = setInterval(() => loadReport({ silent: true }), REFRESH_INTERVAL);
    return () => {
      clearTimeout(initialLoad);
      clearInterval(interval);
    };
  }, [loadReport]);

  useEffect(() => {
    const initialLoad = setTimeout(loadRecentMatches, 0);
    const interval = setInterval(loadRecentMatches, RECENT_MATCHES_REFRESH_INTERVAL);
    return () => {
      clearTimeout(initialLoad);
      clearInterval(interval);
    };
  }, [loadRecentMatches]);

  const positions = useMemo(() => {
    const values = Object.fromEntries(runners.map((runner) => [runner.runnerId, 0]));
    const matchBets = bets.filter((bet) => bet.marketType === "match" && bet.status === "pending");

    for (const bet of matchBets) {
      for (const runner of runners) {
        const selected = runner.runnerId === bet.marketId;
        const userPosition = bet.type === "yes"
          ? (selected ? Number(bet.profit) : -Number(bet.loss))
          : (selected ? -Number(bet.loss) : Number(bet.profit));
        values[runner.runnerId] -= userPosition;
      }
    }
    return values;
  }, [bets, runners]);

  const runningSessions = useMemo(
    () => sessions.filter(
      (session) => session.isVisible && session.resultStatus !== "settled" && session.status !== "closed"
    ),
    [sessions]
  );
  const declaredSessions = useMemo(
    () => sessions.filter(
      (session) => session.resultStatus === "settled" || (
        session.status === "closed" && session.resultRun !== null && session.resultRun !== undefined
      )
    ),
    [sessions]
  );

  return (
    <div className="min-h-full bg-(--color-bg-main) px-3 py-5 text-(--color-text-dark) md:px-6">
      <Toaster position="top-center" />
      <div className="w-full space-y-4">
        <header className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              title="Back"
              className="flex h-9 w-9 shrink-0 items-center justify-center text-gray-500 hover:text-gray-900"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-gray-900">Match Live Report</h1>
              <p className="truncate text-xs text-gray-500">
                {match ? `${match.homeTeam} vs ${match.awayTeam}` : `ID: ${matchId}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {updatedAt && (
              <span className="hidden text-xs text-gray-400 sm:inline">
                Updated {updatedAt.toLocaleTimeString("en-IN")}
              </span>
            )}
            <button
              type="button"
              onClick={() => loadReport()}
              disabled={refreshing}
              title="Refresh report"
              className="flex h-9 w-9 items-center justify-center border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw size={17} className={refreshing ? "animate-spin" : ""} />
            </button>
          </div>
        </header>

        {error && (
          <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <ScorePanel match={match} score={score} />
        <OddsTable runners={runners} positions={positions} />
        <SessionTable sessions={runningSessions} bets={bets} />
        <DeclaredSessionsTable sessions={declaredSessions} bets={bets} />
        <RecentLiveMatches
          matches={liveMatches}
          currentMatchId={matchId}
          onOpen={(nextMatchId) => {
            window.location.assign(
              `/superadmin/matches/${encodeURIComponent(nextMatchId)}/live-report`
            );
          }}
        />

        <button
          type="button"
          onClick={() => setShowMatchBets((visible) => !visible)}
          className="w-full cursor-pointer rounded-lg bg-(--color-btn-bg) px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-(--color-btn-hover)"
        >
          {showMatchBets ? "Hide All Bets" : "Show All Bets"}
        </button>

        {showMatchBets && <BetsTable bets={bets.filter((bet) => bet.marketType === "match")} />}
      </div>
    </div>
  );
}
