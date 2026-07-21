import React from "react";

const MARKET_LABELS = {
  OPEN: "OPEN",
  SUSPEND: "SUSPEND",
  CLOSED: "CLOSED",
};

const MARKET_COLORS = {
  OPEN: "bg-[#2f7a34]",
  SUSPEND: "bg-[#c9861a]",
  CLOSED: "bg-[#b3261e]",
};

const normalize = (s) => (s || "").trim().toLowerCase();

export default function ScoreHeader({
  team1,
  team2,
  team1Score = "",
  team2Score = "",
  firstBattingTeam = "",
  secondBattingTeam = "",
  currentInnings = 1, // 1 = 1st inn live, 2 = 2nd inn live, 3 = match complete
  firstInningsScore = null, // { runs, wickets, overs }
  secondInningsScore = null, // { runs, wickets, overs }
  runs = 0,
  wickets = 0,
  overs = 0,
  marketStatus = "OPEN",
  scoreText = "",
  tossMessage = "",
}) {
  const isFirstBatter = (team) =>
    !!firstBattingTeam && !!team && normalize(firstBattingTeam) === normalize(team);
  const isSecondBatter = (team) =>
    !!secondBattingTeam && !!team && normalize(secondBattingTeam) === normalize(team);

  const formatScore = (r, w, o) => `${r}/${w} (${Number(o).toFixed(1)})`;

  // Live score = current runs/wickets/overs from scoreData (always reflects whichever
  // innings is currently in progress).
  const getLiveScore = () => formatScore(runs, wickets, overs);

  // Decide what score (if any) belongs under a given physical team (team1 or team2)
  const getTeamScoreText = (team) => {
    // Team batted first
    if (isFirstBatter(team)) {
      if (currentInnings === 1) {
        // Still batting first — show live score
        return getLiveScore();
      }
      // 2nd innings in progress or match complete — first innings is frozen
      if (firstInningsScore) {
        return formatScore(firstInningsScore.runs, firstInningsScore.wickets, firstInningsScore.overs);
      }
      return null;
    }

    // Team batted second
    if (isSecondBatter(team)) {
      if (currentInnings === 2) {
        // Second innings in progress — show live score
        return getLiveScore();
      }
      if (currentInnings === 3 && secondInningsScore) {
        // Match complete — show frozen second innings total
        return formatScore(secondInningsScore.runs, secondInningsScore.wickets, secondInningsScore.overs);
      }
      return null; // second team named but hasn't started batting yet
    }

    return null;
  };

  const getTeamDisplay = (team) => {
    const scoreStr = getTeamScoreText(team);
    return scoreStr ? `${team} ${scoreStr}` : team;
  };

  // Middle badge: prefer explicit status text; otherwise show the live score
  // for whichever innings is currently active.
  const getMiddleBadgeText = () => {
    if (scoreText) return scoreText;
    if (currentInnings === 3) return "MATCH COMPLETE";
    if (firstBattingTeam || secondBattingTeam) return getLiveScore();
    return "";
  };

  const badgeColor = MARKET_COLORS[marketStatus] || MARKET_COLORS.OPEN;
  const middleText = getMiddleBadgeText();

  return (
    <div className="w-full">
      <div className="pb-1 text-center text-sm text-gray-500">
        {tossMessage || "Toss pending"}
      </div>
      {/* Match title pill */}
      <div className="flex justify-center py-3">
        <div className="bg-[#4a80a0] text-white font-bold text-sm sm:text-base px-6 py-2 rounded-full shadow-sm">
          Match : {team1} VS {team2}
        </div>
      </div>

      {/* Score strip */}
      <div className="bg-white border border-gray-200 rounded-sm px-4 py-4 flex items-center justify-between gap-3 min-h-[70px]">
        {/* Left team score */}
        <div className="flex-1 text-left">
          <span className="text-[#c0392b] font-bold text-sm sm:text-base text-left">
            {getTeamDisplay(team1)}
          </span>
        </div>

        {/* Center status pill - shows only the selected score/status text */}
        <div className="flex-shrink-0">
          {middleText ? (
            <div className={`${badgeColor} text-white font-bold text-sm sm:text-base px-8 py-2.5 rounded-full text-center min-w-[160px] leading-tight`}>
              {middleText}
            </div>
          ) : (
            <div className="bg-[#2f7a34] rounded-full px-8 py-2.5 w-[220px] h-[38px]" />
          )}
        </div>

        {/* Right team score */}
        <div className="flex-1 text-right">
          <span className="text-[#c0392b] font-bold text-sm sm:text-base text-right">
            {getTeamDisplay(team2)}
          </span>
        </div>
      </div>
    </div>
  );
}
