import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";
import api from "../../constants/api";

const REFRESH_INTERVAL = 3000;

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
    <section className="overflow-hidden border border-gray-200 bg-white shadow-sm">
      <div className="bg-[#5070aa] px-4 py-3 text-center text-white">
        <p className="text-sm font-bold">
          {match?.homeTeam || score?.firstBattingTeam || "Team 1"} vs{" "}
          {match?.awayTeam || score?.secondBattingTeam || "Team 2"}
        </p>
        <p className="mt-1 text-xs text-blue-100">{score?.status || "Match status unavailable"}</p>
      </div>

      <div className="grid grid-cols-1 border-b border-gray-200 sm:grid-cols-[1fr_auto]">
        <div className="px-5 py-4">
          <p className="text-xs font-semibold uppercase text-gray-500">{battingTeam || "Current innings"}</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">
            {Number(score?.runs || 0)}-{Number(score?.wickets || 0)}
            <span className="ml-2 text-base font-medium text-gray-500">({score?.overs || 0})</span>
          </p>
        </div>
        <div className="flex min-w-64 items-center gap-2 border-t border-gray-200 px-5 py-4 sm:border-l sm:border-t-0">
          <span className="mr-1 text-xs font-semibold text-gray-500">THIS OVER</span>
          {balls.length ? balls.map((ball, index) => (
            <span
              key={`${ball.over}-${index}`}
              title={ball.label}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ${
                ball.isWicket ? "bg-red-600" : Number(ball.runs) === 4 ? "bg-green-600" : "bg-gray-700"
              }`}
            >
              {ball.isWicket ? "W" : ball.runs}
            </span>
          )) : <span className="text-sm text-gray-400">No ball data</span>}
        </div>
      </div>
    </section>
  );
}

function OddsTable({ runners, positions }) {
  return (
    <section className="overflow-x-auto border border-gray-200 bg-white shadow-sm">
      <table className="w-full min-w-[620px] border-collapse text-sm">
        <thead>
          <tr>
            <th className="bg-[#4c89a8] px-4 py-3 text-left font-semibold text-white">TEAM</th>
            <th className="bg-blue-200 px-4 py-3 text-center font-semibold text-gray-800">LAGAI</th>
            <th className="bg-pink-200 px-4 py-3 text-center font-semibold text-gray-800">KHAI</th>
            <th className="bg-[#4c89a8] px-4 py-3 text-center font-semibold text-white">SUPERADMIN +/-</th>
          </tr>
        </thead>
        <tbody>
          {runners.map((runner) => (
            <tr key={runner.runnerId}>
              <td className="border border-gray-200 px-4 py-4 font-semibold text-gray-800">
                {runner.runnerName}
              </td>
              <td className="border border-gray-200 bg-blue-50 px-4 py-4 text-center font-bold">
                {runner.lagai || "-"}
              </td>
              <td className="border border-gray-200 bg-pink-50 px-4 py-4 text-center font-bold">
                {runner.khai || "-"}
              </td>
              <td className="border border-gray-200 px-4 py-4 text-center">
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

function BetsTable({ bets }) {
  return (
    <section className="overflow-hidden border border-gray-200 bg-white shadow-sm">
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
  const [bets, setBets] = useState([]);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);

  const loadReport = useCallback(async ({ silent = false } = {}) => {
    if (!matchId) return;
    if (!silent) setRefreshing(true);

    const [matchResult, scoreResult, runnersResult, betsResult] = await Promise.allSettled([
      api.get(`/matches/saved/${encodeURIComponent(matchId)}`),
      api.get(`/manual/score/${encodeURIComponent(matchId)}`),
      api.get(`/manual/state/${encodeURIComponent(matchId)}`),
      api.get("/bet/match", { params: { matchId } }),
    ]);

    if (matchResult.status === "fulfilled") setMatch(matchResult.value.data?.data || null);
    if (scoreResult.status === "fulfilled") setScore(scoreResult.value.data?.data || null);
    if (runnersResult.status === "fulfilled") {
      setRunners(Array.isArray(runnersResult.value.data?.data) ? runnersResult.value.data.data : []);
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

  useEffect(() => {
    const initialLoad = setTimeout(loadReport, 0);
    const interval = setInterval(() => loadReport({ silent: true }), REFRESH_INTERVAL);
    return () => {
      clearTimeout(initialLoad);
      clearInterval(interval);
    };
  }, [loadReport]);

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

  return (
    <div className="min-h-full bg-[#f3f5f7] px-3 py-5 text-gray-800 md:px-6">
      <div className="mx-auto max-w-6xl space-y-4">
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
        <BetsTable bets={bets} />
      </div>
    </div>
  );
}
