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
  runs = 0,
  wickets = 0,
  overs = 0,
  marketStatus = "OPEN",
  scoreText = "",
}) {
  // Helper to check if a team is currently batting
  const isBatting = (team) =>
    !!firstBattingTeam && !!team && normalize(firstBattingTeam) === normalize(team);

  // Format the score string: runs/wickets (overs)
  const formatScore = (runs, wickets, overs) => {
    const formattedOvers = Number(overs).toFixed(1);
    return `${runs}/${wickets} (${formattedOvers})`;
  };

  // Get the formatted score string
  const getFormattedScore = () => {
    return formatScore(runs, wickets, overs);
  };

  // Determine batting teams
  const isTeam1Batting = isBatting(team1);
  const isTeam2Batting = isBatting(team2);

  // Get the display text for middle badge
  const getMiddleBadgeText = () => {
    // Priority 1: Use scoreText if provided (for custom messages like "Yet to Bat", "Innings Break")
    if (scoreText) {
      return scoreText;
    }
    // Priority 2: Use formatted score if a team is batting
    if (firstBattingTeam) {
      return getFormattedScore();
    }
    return "";
  };

  // Get team display with or without score
  const getTeamDisplay = (team, isBattingTeam) => {
    if (isBattingTeam) {
      return `${team} ${getFormattedScore()}`;
    }
    return team;
  };

  // Get badge color based on market status
  const badgeColor = MARKET_COLORS[marketStatus] || MARKET_COLORS.OPEN;

  const middleText = getMiddleBadgeText();

  return (
    <div className="w-full">
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
            {isTeam1Batting ? getTeamDisplay(team1, true) : team1}
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
            {isTeam2Batting ? getTeamDisplay(team2, true) : team2}
          </span>
        </div>
      </div>
    </div>
  );
}