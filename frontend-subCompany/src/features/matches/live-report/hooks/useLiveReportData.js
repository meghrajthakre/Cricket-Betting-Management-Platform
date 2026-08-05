import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchMatchBets,
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
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isBetsLoading, setIsBetsLoading] = useState(false);
  const reportRequestRef = useRef(false);
  const recentRequestRef = useRef(false);

  const loadReport = useCallback(
    async ({ initial = false, signal } = {}) => {
      if (!matchId || reportRequestRef.current || document.hidden) return;
      reportRequestRef.current = true;
      if (initial) setIsInitialLoading(true);

      try {
        const report = await fetchLiveReport(matchId, signal);
        if (report.match !== undefined) setMatch(report.match || null);
        if (report.score !== undefined) setScore(report.score || null);
        if (report.runners !== undefined) setRunners(report.runners);
        if (report.sessions !== undefined) setSessions(report.sessions);
        if (report.bets !== undefined) setBets(report.bets);
        setError(report.betsError);
      } catch (requestError) {
        if (requestError.code === "ERR_CANCELED") return;
        setError(
          requestError.response?.data?.error ||
            requestError.message ||
            "Live report load nahi ho paaya.",
        );
      } finally {
        reportRequestRef.current = false;
        if (initial) setIsInitialLoading(false);
      }
    },
    [matchId],
  );

  const loadRecentMatches = useCallback(async (signal) => {
    if (recentRequestRef.current || document.hidden) return;
    recentRequestRef.current = true;
    try {
      setLiveMatches(await fetchRecentMatches(signal));
    } finally {
      recentRequestRef.current = false;
    }
  }, []);

  const loadBets = useCallback(async () => {
    if (!matchId || isBetsLoading) return;
    setIsBetsLoading(true);
    try {
      setBets(await fetchMatchBets(matchId));
      setError("");
    } catch (requestError) {
      setError(
        requestError.response?.data?.error ||
          requestError.message ||
          "Live bets load nahi ho paaye.",
      );
    } finally {
      setIsBetsLoading(false);
    }
  }, [isBetsLoading, matchId]);

  useEffect(() => {
    const controller = new AbortController();
    const initialLoad = setTimeout(
      () => loadReport({ initial: true, signal: controller.signal }),
      0,
    );
    const interval = setInterval(
      () => loadReport({ signal: controller.signal }),
      REPORT_REFRESH_INTERVAL,
    );
    return () => {
      controller.abort();
      clearTimeout(initialLoad);
      clearInterval(interval);
    };
  }, [loadReport]);

  useEffect(() => {
    const controller = new AbortController();
    const initialLoad = setTimeout(
      () => loadRecentMatches(controller.signal),
      0,
    );
    const interval = setInterval(
      () => loadRecentMatches(controller.signal),
      RECENT_MATCHES_REFRESH_INTERVAL,
    );
    return () => {
      controller.abort();
      clearTimeout(initialLoad);
      clearInterval(interval);
    };
  }, [loadRecentMatches]);

  const positions = useMemo(
    () => calculateMatchPositions(runners, bets),
    [runners, bets],
  );
  const { runningSessions, declaredSessions } = useMemo(
    () => splitSessions(sessions),
    [sessions],
  );

  return {
    match,
    score,
    runners,
    bets,
    liveMatches,
    error,
    isInitialLoading,
    isBetsLoading,
    positions,
    runningSessions,
    declaredSessions,
    refresh: loadReport,
    refreshBets: loadBets,
  };
}
