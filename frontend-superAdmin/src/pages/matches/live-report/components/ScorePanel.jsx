export default function ScorePanel({ match, score }) {
  const balls = Array.isArray(score?.balls) ? score.balls.slice(-6) : [];
  const battingTeam =
    score?.currentInnings === 2
      ? score?.secondBattingTeam
      : score?.firstBattingTeam;

  return (
    <section className="overflow-hidden rounded-lg border border-(--color-border) bg-white shadow-sm">
      <div className="bg-(--color-banner) px-4 py-2 text-center text-white">
        <p className="text-base font-bold">
          CR Over -{" "}
          {balls
            .map((ball) => (ball.isWicket ? "W" : ball.runs))
            .join("  ") || "0"}
        </p>
      </div>

      <div className="grid min-h-12 grid-cols-[40%_20%_40%] border-b border-gray-300 text-center font-bold">
        <div className="flex min-w-0 items-center justify-center bg-[#acd0df] px-1 py-2 text-[10px] sm:px-3 sm:text-sm">
          {battingTeam || match?.homeTeam || "Team 1"}{" "}
          {Number(score?.runs || 0)}-{Number(score?.wickets || 0)} (
          {score?.overs || 0})
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
