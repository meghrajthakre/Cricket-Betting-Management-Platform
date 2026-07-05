import React from "react";

export default function ScoreHeader({ team1, team2, team1Score, team2Score, scoreText }) {
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
          <span className="text-[#c0392b] font-bold text-sm sm:text-base">
            {team1Score ? `${team1} ${team1Score}` : team1}
          </span>
        </div>

        {/* Center status pill */}
        <div className="flex-shrink-0">
          {scoreText ? (
            <div className="bg-[#2f7a34] text-white font-bold text-sm sm:text-base px-8 py-2.5 rounded-full text-center min-w-[220px]">
              {scoreText}
            </div>
          ) : (
            <div className="bg-[#2f7a34] rounded-full px-8 py-2.5 w-[220px] h-[38px]" />
          )}
        </div>

        {/* Right team score */}
        <div className="flex-1 text-right">
          <span className="text-[#c0392b] font-bold text-sm sm:text-base">
            {team2Score ? `${team2} ${team2Score}` : team2}
          </span>
        </div>
      </div>
    </div>
  );
}