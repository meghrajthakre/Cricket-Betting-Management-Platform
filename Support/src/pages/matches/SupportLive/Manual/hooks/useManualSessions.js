import { useCallback, useEffect, useState } from "react";
import {
    getManualSessions,
    updateAllManualSessionStatuses,
    updateManualSession,
    updateManualSessionStatus,
    updateManualSessionVisibility,
} from "../../../../../services/manualSessionService";

export function useManualSessions(matchId) {
    const [sessions, setSessions] = useState([]);
    const [sessionsLoading, setSessionsLoading] = useState(true);
    const [sessionsError, setSessionsError] = useState("");
    const [pendingFields, setPendingFields] = useState(new Set());
    const [bulkSessionPending, setBulkSessionPending] = useState(false);

    const fetchSessions = useCallback(async () => {
        if (!matchId) return;
        setSessionsLoading(true);
        setSessionsError("");
        try {
            const { data } = await getManualSessions(matchId);
            setSessions(data?.data?.sessions || []);
        } catch (requestError) {
            setSessionsError(
                requestError.response?.data?.message || requestError.message || "Failed to fetch sessions"
            );
        } finally {
            setSessionsLoading(false);
        }
    }, [matchId]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchSessions();
    }, [fetchSessions]);

    const updateSessionField = useCallback(async (
        sessionId,
        field,
        value,
        request,
        forceUpdate = false
    ) => {
        const pendingKey = `${sessionId}:${field}`;
        if (pendingFields.has(pendingKey)) return;

        const previous = sessions.find((session) => session.id === sessionId);
        if (!previous || (!forceUpdate && previous[field] === value)) return;

        setPendingFields((current) => new Set(current).add(pendingKey));
        setSessions((current) =>
            current.map((session) =>
                session.id === sessionId ? { ...session, [field]: value } : session
            )
        );

        try {
            const { data } = await request();
            const saved = data?.data?.session;
            if (saved) {
                setSessions((current) =>
                    current.map((session) => session.id === sessionId ? saved : session)
                );
            }
        } catch (requestError) {
            setSessions((current) =>
                current.map((session) => session.id === sessionId ? previous : session)
            );
            setSessionsError(
                requestError.response?.data?.message || requestError.message || "Failed to update session"
            );
        } finally {
            setPendingFields((current) => {
                const next = new Set(current);
                next.delete(pendingKey);
                return next;
            });
        }
    }, [pendingFields, sessions]);

    const handleSessionField = (sessionId, field, value) =>
        updateSessionField(
            sessionId,
            field,
            value,
            () => updateManualSession(matchId, sessionId, { [field]: value })
        );

    const handleSessionStatus = (sessionId, status) =>
        updateSessionField(
            sessionId,
            "status",
            status,
            () => updateManualSessionStatus(matchId, sessionId, status),
            true
        );

    const handleSessionVisibility = (sessionId, isVisible) =>
        updateSessionField(
            sessionId,
            "isVisible",
            isVisible,
            () => updateManualSessionVisibility(matchId, sessionId, isVisible)
        );

    const updateAllStatuses = async (status) => {
        if (bulkSessionPending) return;
        const previous = sessions;
        setBulkSessionPending(true);
        setSessions((current) => current.map((session) => ({ ...session, status })));
        try {
            const { data } = await updateAllManualSessionStatuses(matchId, status);
            setSessions(data?.data?.sessions || []);
        } catch (requestError) {
            setSessions(previous);
            setSessionsError(
                requestError.response?.data?.message || requestError.message || "Failed to update sessions"
            );
        } finally {
            setBulkSessionPending(false);
        }
    };

    return {
        sessions,
        setSessions,
        sessionsLoading,
        sessionsError,
        pendingFields,
        bulkSessionPending,
        handleSessionField,
        handleSessionStatus,
        handleSessionVisibility,
        updateAllStatuses,
    };
}
