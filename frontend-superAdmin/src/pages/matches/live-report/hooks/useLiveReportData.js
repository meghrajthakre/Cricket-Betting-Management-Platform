import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchLiveReport,
  fetchRecentMatches,
} from "../api/liveReportApi";
import {
  calculateMatchPositions,
  splitSessions,
} from "../utils/reportCalculations";

const REPORT_REFRESH_INTERVAL = 3000;
const RECENT_MATCHES_REFRESH_INTERVAL = 30000;

export function useLiveReportData(matchId) {
  const [match, setMatch] = useState(null);
  const [score, setScore] = useState(null);
  const [runners, setRunners] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [bets, setBets] = useState([]);
  const [liveMatches, setLiveMatches] = useState([]);
  const [error, setError] = useState("");

  const loadReport = useCallback(
    async () => {
      if (!matchId) return;

      const report = await fetchLiveReport(matchId);
      if (report.match !== undefined) setMatch(report.match || null);
      if (report.score !== undefined) setScore(report.score || null);
      if (report.runners !== undefined) setRunners(report.runners);
      if (report.sessions !== undefined) setSessions(report.sessions);
      if (report.bets !== undefined) setBets(report.bets);
      setError(report.betsError);
    },
    [matchId]
  );

  const loadRecentMatches = useCallback(async () => {
    setLiveMatches(await fetchRecentMatches());
  }, []);

  useEffect(() => {
    const initialLoad = setTimeout(loadReport, 0);
    const interval = setInterval(loadReport, REPORT_REFRESH_INTERVAL);
    return () => {
      clearTimeout(initialLoad);
      clearInterval(interval);
    };
  }, [loadReport]);

  useEffect(() => {
    const initialLoad = setTimeout(loadRecentMatches, 0);
    const interval = setInterval(
      loadRecentMatches,
      RECENT_MATCHES_REFRESH_INTERVAL
    );
    return () => {
      clearTimeout(initialLoad);
      clearInterval(interval);
    };
  }, [loadRecentMatches]);

  const positions = useMemo(
    () => calculateMatchPositions(runners, bets),
    [runners, bets]
  );
  const { runningSessions, declaredSessions } = useMemo(
    () => splitSessions(sessions),
    [sessions]
  );

  return {
    match,
    score,
    runners,
    bets,
    liveMatches,
    error,
    positions,
    runningSessions,
    declaredSessions,
    refresh: loadReport,
  };
}
