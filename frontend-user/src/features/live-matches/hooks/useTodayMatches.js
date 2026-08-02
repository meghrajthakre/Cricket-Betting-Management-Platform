import { useCallback, useEffect, useRef, useState } from "react";
import { getSavedMatches } from "../../../shared/api/userService";
import { prepareTodayMatches } from "../utils/matchUtils";

const REFRESH_INTERVAL_MS = 60000;

export default function useTodayMatches() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);
  const requestInProgress = useRef(false);

  const refresh = useCallback(async () => {
    if (requestInProgress.current || document.hidden) return;
    requestInProgress.current = true;
    setLoading(true);
    setError(null);

    try {
      const response = await getSavedMatches();
      const savedMatches = response.data || response;
      if (!Array.isArray(savedMatches)) throw new Error("Unexpected response format.");
      setMatches(prepareTodayMatches(savedMatches));
      setLastFetched(new Date());
    } catch (requestError) {
      console.error("Error fetching saved matches:", requestError);
      setError(requestError.message || "Failed to load matches");
    } finally {
      requestInProgress.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = setTimeout(refresh, 0);
    const interval = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => {
      clearTimeout(initialLoad);
      clearInterval(interval);
    };
  }, [refresh]);

  return { matches, loading, error, lastFetched };
}
