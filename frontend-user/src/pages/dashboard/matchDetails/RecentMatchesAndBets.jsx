import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSavedMatches } from "../../../api/userService.js";

const money = (value) =>
    Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export default function RecentMatchesAndBets({ matchId, bets, runners, sessions }) {
    const navigate = useNavigate();
    const [matches, setMatches] = useState([]);

    useEffect(() => {
        let active = true;

        getSavedMatches()
            .then((response) => {
                const saved = response?.data || response;
                if (!active || !Array.isArray(saved)) return;
                setMatches(
                    saved
                        .filter((match) => String(match.matchId) !== String(matchId))
                        .sort((a, b) => new Date(b.commenceTime) - new Date(a.commenceTime))
                        .slice(0, 5)
                );
            })
            .catch(() => {
                if (active) setMatches([]);
            });

        return () => {
            active = false;
        };
    }, [matchId]);

    const marketNames = useMemo(() => {
        const names = {};
        runners.forEach((runner) => {
            if (runner.runnerId) names[String(runner.runnerId)] = runner.runnerName || runner.name;
        });
        sessions.forEach((session) => {
            if (session.id) names[String(session.id)] = session.sessionName;
        });
        return names;
    }, [runners, sessions]);

    const matchBets = bets.filter((bet) => bet.marketType !== "session");
    const sessionBets = bets.filter((bet) => bet.marketType === "session");

    const renderBetGroup = (title, groupBets) => {
        const isSessionGroup = groupBets.some((bet) => bet.marketType === "session");
        const gridClass = isSessionGroup
            ? "grid-cols-[minmax(0,2fr)_0.8fr_1fr_0.7fr_0.7fr]"
            : "grid-cols-[minmax(0,2fr)_0.8fr_1fr_0.7fr]";

        return (
            <section className="mx-auto w-full max-w-2xl overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm">
                <div className="bg-[#12304b] px-3 py-2 text-center text-sm font-extrabold uppercase tracking-wide text-white">
                    {title} ({groupBets.length})
                </div>

                {groupBets.length === 0 ? (
                    <p className="px-3 py-4 text-center text-xs text-slate-500">
                        Koi {title.toLowerCase()} nahi hai.
                    </p>
                ) : (
                    <div>
                        <div className={`grid ${gridClass} items-center gap-1 border-b border-slate-300 bg-slate-100 px-2 py-2 text-center text-[10px] font-bold uppercase text-slate-600 sm:px-3 sm:text-xs`}>
                            <span className="text-left">Market</span>
                            <span>Side</span>
                            <span>Amount</span>
                            <span>{isSessionGroup ? "Run" : "Rate"}</span>
                            {isSessionGroup && <span>Rate</span>}
                        </div>
                        <div className="divide-y divide-slate-200">
                        {groupBets.map((bet) => (
                            <div
                                key={bet._id}
                                className={`grid ${gridClass} items-center gap-1 px-2 py-3 text-center text-[11px] text-slate-700 sm:px-3 sm:text-xs`}
                            >
                                <p className="min-w-0 break-words pr-1 text-left font-bold text-slate-900">
                                    {marketNames[String(bet.marketId)] || bet.marketId}
                                </p>
                                <span className="font-semibold text-slate-700">
                                    {bet.type === "yes" ? "LAGAI" : "KHAI"}
                                </span>
                                <strong className="text-slate-900">{money(bet.amount)}</strong>
                                <strong className="text-slate-900">
                                    {bet.marketType === "session" ? bet.sessionRun ?? bet.rate : bet.rate}
                                </strong>
                                {isSessionGroup && (
                                    <strong className="text-slate-900">{bet.sessionRate ?? "-"}</strong>
                                )}
                            </div>
                        ))}
                        </div>
                    </div>
                )}
            </section>
        );
    };

    return (
        <div className="mt-3 space-y-3 pb-4">
            {sessionBets.length > 0 && renderBetGroup("Session Bets", sessionBets)}
            {matchBets.length > 0 && renderBetGroup("Match Bets", matchBets)}

            <section className="mx-auto w-full max-w-2xl overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm">
                <div className="bg-[#12304b] px-3 py-2 text-center text-sm font-extrabold uppercase tracking-wide text-white">
                    Recent Matches
                </div>
                {matches.length === 0 ? (
                    <p className="px-3 py-5 text-center text-sm text-slate-500">
                        Koi aur recent match available nahi hai.
                    </p>
                ) : (
                    <div className="divide-y divide-slate-200">
                        {matches.map((match) => (
                            <button
                                key={match.matchId}
                                type="button"
                                onClick={() => navigate(`/match/${match.matchId}`)}
                                className="w-full cursor-pointer px-3 py-3 text-center transition hover:bg-slate-50"
                            >
                                <div className="min-w-0">
                                    <p className="break-words text-sm font-bold text-slate-900">
                                        {match.homeTeam} vs {match.awayTeam}
                                    </p>
                                    <p className="mt-1 text-[10px] text-slate-500">
                                        {match.commenceTime
                                            ? new Date(match.commenceTime).toLocaleString("en-IN", {
                                                day: "2-digit",
                                                month: "short",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })
                                            : "Time unavailable"}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
