export function isToday(dateStr) {
  const matchDate = new Date(dateStr);
  if (Number.isNaN(matchDate.getTime())) return false;

  const today = new Date();
  return (
    matchDate.getFullYear() === today.getFullYear() &&
    matchDate.getMonth() === today.getMonth() &&
    matchDate.getDate() === today.getDate()
  );
}

export function parseDateTime(dateStr) {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return { day: "—", month: "—", time: "—" };

  return {
    day: String(date.getDate()),
    month: date.toLocaleString("en-IN", { month: "long" }),
    time: date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).toUpperCase(),
  };
}

export function extractBestOdds(match) {
  const bookmakers = match.odds?.bookmakers;
  if (!Array.isArray(bookmakers) || bookmakers.length === 0) {
    return { matchBets: "—", sessionBets: "—" };
  }

  const prices = bookmakers.flatMap((bookmaker) => {
    const outcomes = bookmaker.markets?.[0]?.outcomes;
    return Array.isArray(outcomes)
      ? outcomes.slice(0, 2).map((outcome) => Number(outcome.price)).filter(Number.isFinite)
      : [];
  });

  if (prices.length === 0) return { matchBets: "—", sessionBets: "—" };
  return {
    matchBets: Math.max(...prices).toFixed(2),
    sessionBets: Math.min(...prices).toFixed(2),
  };
}

export function normalizeSavedMatch(match) {
  const dateParts = parseDateTime(match.commenceTime);
  const odds = extractBestOdds(match);
  return {
    id: match.matchId,
    title: `${match.homeTeam} vs ${match.awayTeam}`,
    subtitle: match.sportKey || "Cricket",
    ...odds,
    ...dateParts,
    venue: match.venue || "",
    status: "scheduled",
    score: null,
    raw: match,
    teams: [match.homeTeam, match.awayTeam],
  };
}

export function prepareTodayMatches(savedMatches) {
  return savedMatches
    .filter((match) => isToday(match.commenceTime))
    .map(normalizeSavedMatch)
    .sort((first, second) =>
      new Date(first.raw.commenceTime) - new Date(second.raw.commenceTime)
    );
}

export function groupMatchesByDate(matches) {
  return matches.reduce((groups, match) => {
    const key = `${match.day} ${match.month}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(match);
    return groups;
  }, {});
}
