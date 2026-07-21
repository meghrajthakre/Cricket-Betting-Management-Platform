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
import { getMyBets, getWalletBalance, placeBet } from "../../../api/userService.js";
import { useAuthStore } from "../../../store/authStore.js";
import { useCoinStore } from "../../../store/coinStore.js";

export default function MatchDetails() {
    const { matchId } = useParams();
    const user = useAuthStore((state) => state.user);
    const setCoins = useCoinStore((state) => state.setCoins);
    const [selectedBet, setSelectedBet] = useState(null);
    const [placingBet, setPlacingBet] = useState(false);
    const [betSuccess, setBetSuccess] = useState("");
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

    const openBetSlip = (selection) => {
        if (!Number.isFinite(Number(selection.rate)) || Number(selection.rate) < 1) return;
        setBetSuccess("");
        setSelectedBet(selection);
    };

    const handlePlaceBet = async ({ amount }) => {
        if (!selectedBet) return;
        setPlacingBet(true);

        try {
            const result = await placeBet(user?._id, matchId, amount, Number(selectedBet.rate), {
                type: selectedBet.type,
                marketType: selectedBet.marketType,
                marketId: selectedBet.marketId || "",
            });

            if (result.data) {
                setMyBets((current) => [result.data, ...current]);
            }

            if (user?._id) {
                try {
                    const wallet = await getWalletBalance(user._id);
                    setCoins(wallet.data.data.balance);
                } catch {
                    // Bet is already placed; a balance refresh failure must not
                    // report the placement as failed and invite a duplicate bet.
                }
            }

            setBetSuccess(`Bet placed: ${selectedBet.name} · ${selectedBet.type.toUpperCase()} @ ${selectedBet.rate} · ${amount}`);
            setSelectedBet(null);
            return result;
        } finally {
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
            <div className="max-w-4xl mx-auto px-2 py-2 ">
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
                />

                <BetSlip
                    key={`${selectedBet?.marketType || "none"}-${selectedBet?.marketId || "none"}-${selectedBet?.type || "none"}`}
                    selection={selectedBet}
                    positions={selectedBet?.marketType === "match" ? runnerPositions : {}}
                    maxBet={selectedBet?.marketType === "session" ? options.sessionMaxBet : options.matchMaxBet}
                    onClose={() => setSelectedBet(null)}
                    onSubmit={handlePlaceBet}
                    submitting={placingBet}
                />

                {betSuccess && (
                    <div className="mt-2 rounded bg-green-100 px-3 py-2 text-sm font-semibold text-green-800">
                        {betSuccess}
                    </div>
                )}

                <SessionMarket
                    sessions={visibleSessions}
                    settings={settings}
                    onPlaceBet={openBetSlip}
                    maxBet={options.sessionMaxBet}
                />

            </div>
        </div>
    );
}
