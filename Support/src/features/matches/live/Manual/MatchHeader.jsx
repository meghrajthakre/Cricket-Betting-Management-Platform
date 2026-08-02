import { useNavigate, useParams } from "react-router-dom";
import { C, MATCH } from "./constants";
import SlidingBalls from "../SlidingBalls";

const MARKET_COLORS = {
  OPEN: "bg-[#2f7a34]",
  SUSPEND: "bg-[#c9861a]",
  CLOSED: "bg-[#b3261e]",
};

const normalize = (s) => (s || "").trim().toLowerCase();

export default function MatchHeader({ 
    match,
    team1 = "",
    team2 = "",
    firstBattingTeam = "",
    secondBattingTeam = "",
    currentInnings = 1,
    firstInningsScore = null,
    runs = 0,
    wickets = 0,
    overs = 0,
    marketStatus = "OPEN",
    scoreText = "",
    balls = [],
    tossMessage = "",
    chaseBalls = 120,
    revisedTarget = null,
}) {
    const navigate = useNavigate();
    const { matchId } = useParams();

    const handleManual = () => {
        navigate(`/support/matches/${matchId}/play`);
    };

    // Check if a team is batting
    const isBatting = (team) =>
        !!firstBattingTeam && !!team && normalize(firstBattingTeam) === normalize(team);

    // Format the score string
    const formatScore = (runs, wickets, overs) => {
        const formattedOvers = Number(overs).toFixed(1);
        return `${runs}/${wickets} (${formattedOvers})`;
    };

    const isTeam1Batting = isBatting(team1);
    const isTeam2Batting = isBatting(team2);
    const badgeColor = MARKET_COLORS[marketStatus] || MARKET_COLORS.OPEN;

    // Get the formatted score
    const getFormattedScore = () => {
        return formatScore(runs, wickets, overs);
    };

    // Get team display with score
    const getTeamDisplay = (team, isBattingTeam) => {
        if (isBattingTeam) {
            return `${team} ${getFormattedScore()}`;
        }
        return team;
    };

    // Get middle badge text
    const getMiddleText = () => {
        if (scoreText) {
            return scoreText;
        }
        if (firstBattingTeam) {
            return getFormattedScore();
        }
        return MATCH.centerScore || "";
    };

    const middleText = getMiddleText();

    const getStatusMessage = () => {
        if (currentInnings !== 2 || !secondBattingTeam || !firstInningsScore) {
            return tossMessage || "Toss pending";
        }

        const target = Number(revisedTarget) > 0 ? Number(revisedTarget) : Number(firstInningsScore.runs || 0) + 1;
        const completedOvers = Math.floor(Number(overs) || 0);
        const ballsInCurrentOver = Math.round(((Number(overs) || 0) - completedOvers) * 10);
        const ballsRemaining = Math.max(Number(chaseBalls || 120) - ((completedOvers * 6) + ballsInCurrentOver), 0);
        const runsNeeded = Math.max(target - Number(runs || 0), 0);

        const chaseFinished = runsNeeded === 0 || Number(wickets || 0) >= 10 || ballsRemaining === 0;
        if (chaseFinished && tossMessage) return tossMessage;

        return `${secondBattingTeam} needs ${runsNeeded} runs in ${ballsRemaining} balls`;
    };

    return (
        <>
            <div className="flex justify-end mb-3">
                <button onClick={handleManual}
                    className="group text-white text-lg cursor-pointer font-bold px-6 py-2.5 rounded-lg transition-all duration-300 ease-out hover:scale-105 hover:shadow-lg active:scale-95 shadow-md relative overflow-hidden"
                    style={{ background: C.startManual }}
                >
                    <span className="relative z-10 flex items-center gap-2">
                        Start automated match
                        <svg
                            className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </span>
                </button>
            </div>

            <div className="text-center text-gray-500 text-sm mb-2">{getStatusMessage()}</div>

            {/* Real ball-by-ball history, replaces the old static MATCH.balls row */}
            <SlidingBalls balls={balls} />

            <div className="flex justify-center mb-3">
                <span
                    className="text-white text-sm font-semibold px-6 py-1.5 rounded-full"
                    style={{ background: C.matchBadge }}
                >
                    Match : {team1} VS {team2}
                </span>
            </div>

            {/* Score strip - updated with new design */}
            <div className="grid grid-cols-3 border border-gray-300 rounded overflow-hidden mb-4 bg-white">
                {/* Left team */}
                <div className="py-2.5 pl-4 text-sm font-bold" style={{ color: C.notText }}>
                    {isTeam1Batting ? getTeamDisplay(team1, true) : team1.toUpperCase()}
                </div>

                {/* Center status pill */}
                <div className="flex items-center justify-center py-1.5">
                    {middleText ? (
                        <div className={`${badgeColor} text-white font-bold text-sm sm:text-base px-6 py-1.5 rounded-full text-center min-w-[120px] leading-tight`}>
                            {middleText}
                        </div>
                    ) : (
                        <div className="bg-[#2f7a34] rounded-full px-6 py-1.5 w-[120px] h-[34px]" />
                    )}
                </div>

                {/* Right team */}
                <div className="py-2.5 pr-4 text-sm font-bold text-right" style={{ color: C.notText }}>
                    {isTeam2Batting ? getTeamDisplay(team2, true) : team2.toUpperCase()}
                </div>
            </div>
        </>
    );
}
