import { useState, useEffect } from "react";
import { getSavedMatchById } from "../../../../api/userService";

// Fetches the saved match (home/away team names) once per matchId.
export default function useSavedMatch(matchId) {
    const [savedMatch, setSavedMatch] = useState(null);

    useEffect(() => {
        if (!matchId) return;
        let cancelled = false;

        (async () => {
            try {
                const res = await getSavedMatchById(matchId);
                if (!cancelled) setSavedMatch(res?.data || null);
            } catch (err) {
                console.error("Failed to load saved match:", err?.response?.data || err.message);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [matchId]);

    return savedMatch;
}