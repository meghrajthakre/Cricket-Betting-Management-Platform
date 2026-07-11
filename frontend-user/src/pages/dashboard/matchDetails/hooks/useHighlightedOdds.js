import { useState, useRef, useCallback, useEffect } from "react";

// Manages the transient "just updated" highlight flags for runner odds.
// triggerHighlight(runnerId) flips lagai/khai highlight flags on, then
// clears ALL highlights after `duration` ms (matches original behavior:
// a single shared timeout resets the whole highlightedOdds map, not just
// the runner that triggered it).
export default function useHighlightedOdds(duration = 1500) {
    const [highlightedOdds, setHighlightedOdds] = useState({});
    const timeoutRef = useRef(null);

    const triggerHighlight = useCallback((runnerId) => {
        setHighlightedOdds((prev) => ({
            ...prev,
            [runnerId]: { lagai: true, khai: true },
        }));

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
            setHighlightedOdds({});
        }, duration);
    }, [duration]);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return { highlightedOdds, triggerHighlight };
}