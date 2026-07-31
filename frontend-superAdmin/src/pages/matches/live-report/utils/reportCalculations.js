export const formatNumber = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  });

export function calculateMatchPositions(runners, bets) {
  const positions = Object.fromEntries(
    runners.map((runner) => [runner.runnerId, 0])
  );
  const matchBets = bets.filter(
    (bet) => bet.marketType === "match" && bet.status === "pending"
  );

  for (const bet of matchBets) {
    for (const runner of runners) {
      const selected = runner.runnerId === bet.marketId;
      const userPosition =
        bet.type === "yes"
          ? selected
            ? Number(bet.profit)
            : -Number(bet.loss)
          : selected
            ? -Number(bet.loss)
            : Number(bet.profit);
      positions[runner.runnerId] -= userPosition;
    }
  }

  return positions;
}

export function splitSessions(sessions) {
  return {
    runningSessions: sessions.filter(
      (session) =>
        session.isVisible &&
        session.resultStatus !== "settled" &&
        session.status !== "closed"
    ),
    declaredSessions: sessions.filter(
      (session) =>
        session.resultStatus === "settled" ||
        (session.status === "closed" &&
          session.resultRun !== null &&
          session.resultRun !== undefined)
    ),
  };
}

export function buildSessionLadder(session, bets) {
  const pendingBets = bets.filter(
    (bet) =>
      bet.marketType === "session" &&
      bet.marketId === session.id &&
      bet.status === "pending"
  );
  const lines = pendingBets
    .map((bet) => Number(bet.sessionRun ?? bet.rate))
    .filter(Number.isFinite);
  const quoteLines = [Number(session.noRun), Number(session.yesRun)].filter(
    Number.isFinite
  );
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
      return (
        total +
        (userWon ? -Number(bet.profit || 0) : Number(bet.loss || 0))
      );
    }, 0);
    return { run, position: Number(position.toFixed(2)) };
  });
}

export function calculateDeclaredSessions(sessions, bets) {
  return sessions
    .map((session) => {
      const sessionBets = bets.filter(
        (bet) =>
          bet.marketType === "session" && bet.marketId === session.id
      );
      const plusMinus = sessionBets.reduce((total, bet) => {
        if (bet.status === "won") return total - Number(bet.profit || 0);
        if (bet.status === "lost") return total + Number(bet.loss || 0);
        return total;
      }, 0);
      return { ...session, plusMinus: Number(plusMinus.toFixed(2)) };
    })
    .sort(
      (a, b) =>
        new Date(b.settledAt || 0).getTime() -
        new Date(a.settledAt || 0).getTime()
    );
}
