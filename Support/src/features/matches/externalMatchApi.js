export async function fetchExternalAndSavedMatches(client) {
  const [externalResponse, savedResponse] = await Promise.all([
    client.get("/matches/external"),
    client.get("/matches/saved"),
  ]);

  const matches = Array.isArray(externalResponse.data?.data) ? externalResponse.data.data : [];
  const savedMatches = Array.isArray(savedResponse.data?.data) ? savedResponse.data.data : [];
  return {
    matches,
    savedMatchIds: new Set(savedMatches.map((match) => String(match.matchId))),
  };
}

export async function addExternalMatch(matchId, client) {
  return client.post("/matches/external/save", { matchId });
}
