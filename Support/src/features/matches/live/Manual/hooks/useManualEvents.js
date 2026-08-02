import { useEffect, useRef } from "react";
import apiClient from "../../../../../shared/api/apiClient";

const API_BASE = apiClient.defaults.baseURL;
const MAX_BALLS = 10;

export function useManualEvents(matchId, handlers) {
    const handlersRef = useRef(handlers);

    useEffect(() => {
        handlersRef.current = handlers;
    }, [handlers]);

    useEffect(() => {
        if (!matchId) return undefined;

        const eventSource = new EventSource(`${API_BASE}/manual/events?matchId=${matchId}`);

        eventSource.onmessage = (event) => {
            try {
                const parsed = JSON.parse(event.data);
                const current = handlersRef.current;
                if (parsed.payload?.matchId !== matchId) return;

                if (parsed.type === "SCORE_UPDATED") {
                    current.setScoreData((previous) => ({
                        ...previous,
                        ...parsed.payload,
                        balls: Array.isArray(parsed.payload.balls)
                            ? parsed.payload.balls.slice(-MAX_BALLS)
                            : previous.balls,
                    }));
                    if (parsed.payload.status !== undefined) {
                        current.setSelectedStatus(parsed.payload.status);
                    }
                }

                if (parsed.type === "SETTINGS_UPDATED") {
                    current.setManualSettings(parsed.payload);
                    if (parsed.payload.marketStatus) {
                        current.setMarketStatus(parsed.payload.marketStatus);
                    }
                }

                if (parsed.type === "SESSION_UPDATED") {
                    const updated = parsed.payload.session;
                    current.setSessions((previous) =>
                        previous.map((session) => session.id === updated.id ? updated : session)
                    );
                }

                if (parsed.type === "SESSIONS_UPDATED") {
                    current.setSessions(parsed.payload.sessions || []);
                }

                if (parsed.type === "MATCH_UPDATED") {
                    current.setMatch((previous) => ({ ...previous, ...parsed.payload }));
                }

                if (parsed.type === "OPTIONS_UPDATED") {
                    current.setOptions(parsed.payload);
                }
            } catch (parseError) {
                console.error("Failed to parse SSE message:", parseError);
            }
        };

        eventSource.onerror = (connectionError) => {
            console.error("SSE connection error:", connectionError);
        };

        return () => eventSource.close();
    }, [matchId]);
}
