import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import useSavedMatch from "./hooks/useSavedMatch";
import useManualScoreboard from "./hooks/useManualScoreboard.js";
import ScoreHeader from "./ScoreHeader.jsx";
import OddsMarket from "./Oddsmarket.jsx";
import SessionMarket from "./Sessionmarket.jsx";
import LoadingState from "./LoadingState.jsx";
import ErrorState from "./ErrorState.jsx";
import { MOCK_DATA } from "./mockData.js";
import MatchMessages from "./MatchMessages.jsx";
import BetSlip from "./BetSlip.jsx";
import BetResultModal from "./BetResultModal.jsx";
import { getMyBets, getWalletBalance, placeBet } from "../../../api/userService.js";
import { useAuthStore } from "../../../store/authStore.js";
import { useCoinStore } from "../../../store/coinStore.js";
import RecentMatchesAndBets from "./RecentMatchesAndBets.jsx";
import LiveTvPanel from "./LiveTvPanel.jsx";

const MIN_BET_LOADER_MS = 500;

function FullScreenBetLoader() {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#07182a]/80 px-5 backdrop-blur-sm">
            <div className="flex w-full max-w-xs flex-col items-center rounded-2xl border border-white/15 bg-[#102943] px-6 py-8 text-center text-white shadow-2xl">
                <div className="relative h-16 w-16">
                    <div className="absolute inset-0 animate-ping rounded-full bg-[#4e9bd1]/25" />
                    <div className="absolute inset-1 animate-spin rounded-full border-4 border-white/20 border-t-[#62b5ed]" />
                </div>
                <p className="mt-5 text-base font-extrabold tracking-wide">BET PLACE HO RAHI HAI</p>
                <p className="mt-2 text-xs leading-5 text-white/65">Rate aur wallet verify ho rahe hain.<br />Please wait...</p>
            </div>
        </div>
    );
}

export default function MatchDetails() {
    const { matchId } = useParams();
    const user = useAuthStore((state) => state.user);
    const setCoins = useCoinStore((state) => state.setCoins);
    const [selectedBet, setSelectedBet] = useState(null);
    const [placingBet, setPlacingBet] = useState(false);
    const [betResult, setBetResult] = useState(null);
    const [myBets, setMyBets] = useState([]);

    const savedMatch = useSavedMatch(matchId);
    const {
        runners,
        sessions,
        options,
        settings,
        scoreStatus,
        scoreData,
        highlightedOdds,
        loading,
        error,
        sseConnected,
        sessionSettlementVersion,
        fetchLatestData,
    } = useManualScoreboard(matchId);

    const loadMyBets = useCallback(async () => {
        if (!user?._id || !matchId) return;
        try {
            const response = await getMyBets(matchId);
            setMyBets(response.data || []);
        } catch {
            setMyBets([]);
        }
    }, [matchId, user?._id]);

    useEffect(() => {
        loadMyBets();
    }, [loadMyBets]);

    useEffect(() => {
        if (!sessionSettlementVersion || !user?._id) return;
        loadMyBets();
        getWalletBalance(user._id)
            .then((response) => {
                const balance = response.data?.data?.balance;
                if (Number.isFinite(Number(balance))) setCoins(Number(balance));
            })
            .catch(() => {});
    }, [loadMyBets, sessionSettlementVersion, setCoins, user?._id]);

    const runnerPositions = useMemo(() => {
        const matchRunners = runners.filter((runner) => runner.runnerId);
        const positions = Object.fromEntries(matchRunners.map((runner) => [runner.runnerId, 0]));
        const pendingMatchBets = myBets.filter(
            (bet) => bet.status === "pending" && bet.marketType === "match" && positions[bet.marketId] !== undefined
        );

        for (const bet of pendingMatchBets) {
            const selectedRunnerId = bet.marketId;
            const profit = Number(bet.profit) || 0;
            const liability = Number(bet.loss) || 0;

            for (const runner of matchRunners) {
                if (bet.type === "yes") {
                    positions[runner.runnerId] += runner.runnerId === selectedRunnerId ? profit : -liability;
                } else {
                    positions[runner.runnerId] += runner.runnerId === selectedRunnerId ? -liability : profit;
                }
            }
        }

        return positions;
    }, [myBets, runners]);

    const settledResults = useMemo(() => myBets.reduce(
        (results, bet) => {
            if (bet.status !== "won" && bet.status !== "lost") return results;
            const key = bet.marketType === "session" ? "session" : "match";
            const amount = bet.status === "won"
                ? Number(bet.profit) || 0
                : -(Number(bet.loss) || 0);
            results[key] = Number((results[key] + amount).toFixed(2));
            return results;
        },
        { match: 0, session: 0 }
    ), [myBets]);

    const openBetSlip = (selection) => {
        if (!Number.isFinite(Number(selection.rate)) || Number(selection.rate) < 1) return;
        setBetResult(null);
        setSelectedBet(selection);
    };

    const handlePlaceBet = async ({ amount }) => {
        if (!selectedBet) return;
        const submittedBet = selectedBet;
        const loaderStartedAt = Date.now();
        setPlacingBet(true);

        try {
            const result = await placeBet(user?._id, matchId, amount, Number(selectedBet.rate), {
                type: selectedBet.type,
                marketType: selectedBet.marketType,
                marketId: selectedBet.marketId || "",
                ...(selectedBet.marketType === "session"
                    ? { sessionRate: selectedBet.sessionRate }
                    : {}),
            });

            if (result.data) {
                setMyBets((current) => [result.data, ...current]);
            }

            if (Number.isFinite(Number(result.balance))) {
                setCoins(Number(result.balance));
            }

            setSelectedBet(null);
            setBetResult({
                type: "success",
                message: "Aapki bet successfully accept ho gayi hai.",
                details: submittedBet.marketType === "session"
                    ? `${submittedBet.name} · ${submittedBet.type.toUpperCase()} · Run ${submittedBet.rate} · Rate ${submittedBet.sessionRate} · Coins ${amount}`
                    : `${submittedBet.name} · ${submittedBet.type === "yes" ? "LAGAI" : "KHAI"} · Rate ${submittedBet.rate} · Coins ${amount}`,
            });
            return result;
        } catch (error) {
            setSelectedBet(null);
            setBetResult({
                type: "error",
                message: "",
                details: "",
            });
            throw error;
        } finally {
            const remainingLoaderTime = MIN_BET_LOADER_MS - (Date.now() - loaderStartedAt);
            if (remainingLoaderTime > 0) {
                await new Promise((resolve) => window.setTimeout(resolve, remainingLoaderTime));
            }
            setPlacingBet(false);
        }
    };

    if (!matchId) {
        return (
            <div className="flex items-center justify-center h-40 bg-[#E8EDF3]">
                <p className="text-[#d23131] font-semibold">
                    No matchId found in the URL.
                </p>
            </div>
        );
    }

    if (loading && runners.length === 0) {
        return <LoadingState />;
    }

    if (error) {
        return <ErrorState error={error} onRetry={() => window.location.reload()} />;
    }

    const visibleSessions = sessions.filter((session) => session.isVisible);

    const match = {
        ...MOCK_DATA.match,
        ...(savedMatch && {
            team1: savedMatch.homeTeam,
            team2: savedMatch.awayTeam,
        }),
    };

    return (
        <div className="bg-[#E8EDF3] min-h-screen">
            {placingBet && <FullScreenBetLoader />}
            <BetResultModal result={betResult} onClose={() => setBetResult(null)} />
            <div className="max-w-4xl mx-auto px-2 py-2 ">
                <LiveTvPanel />

                <ScoreHeader
                    sseConnected={sseConnected}
                    matchId={matchId}
                    onRefresh={fetchLatestData}
                    match={match}
                    tossMessage={options.tossVisibility !== "remove" ? options.tossWinMessage : ""}
                    chaseBalls={options.balls}
                    revisedTarget={options.newTarget}
                    settings={settings}
                    scoreStatus={scoreStatus}
                    balls={scoreData.balls}
                    firstBattingTeam={scoreData.firstBattingTeam}
                    secondBattingTeam={scoreData.secondBattingTeam}
                    currentInnings={scoreData.currentInnings}
                    firstInningsScore={scoreData.firstInningsScore}
                    secondInningsScore={scoreData.secondInningsScore}
                    runs={scoreData.runs}
                    wickets={scoreData.wickets}
                    overs={scoreData.overs}
                />

                <MatchMessages options={options} />

                <OddsMarket
                    runners={runners}
                    teamNames={[match.team1, match.team2]}
                    settings={settings}
                    highlightedOdds={highlightedOdds}
                    maxBet={options.matchMaxBet}
                    onSelectBet={openBetSlip}
                    positions={runnerPositions}
                    settledResult={settledResults.match}
                />

                <BetSlip
                    key={`${selectedBet?.marketType || "none"}-${selectedBet?.marketId || "none"}-${selectedBet?.type || "none"}`}
                    selection={selectedBet}
                    positions={selectedBet?.marketType === "match" ? runnerPositions : {}}
                    runners={runners}
                    maxBet={selectedBet?.marketType === "session" ? options.sessionMaxBet : options.matchMaxBet}
                    onClose={() => setSelectedBet(null)}
                    onSubmit={handlePlaceBet}
                    submitting={placingBet}
                />

                <SessionMarket
                    sessions={visibleSessions}
                    settings={settings}
                    onPlaceBet={openBetSlip}
                    maxBet={options.sessionMaxBet}
                    settledResult={settledResults.session}
                />

                <RecentMatchesAndBets
                    matchId={matchId}
                    bets={myBets}
                    runners={runners}
                    sessions={sessions}
                />

            </div>
        </div>
    );
}
