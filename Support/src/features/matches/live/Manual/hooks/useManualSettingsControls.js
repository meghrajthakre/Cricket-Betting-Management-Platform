import { useCallback, useEffect, useState } from "react";
import apiClient from "../../../../../shared/api/apiClient";

const DEFAULTS = {
    betLock: "Unlock",
    mode: "Lagai",
    sessionLock: "Unlock",
    rateDiff: "1",
};

export function useManualSettingsControls({
    matchId,
    initialSettings,
    settingsLoaded,
    setRateDiff,
}) {
    const [betLock, setBetLock] = useState(DEFAULTS.betLock);
    const [mode, setMode] = useState(DEFAULTS.mode);
    const [sessionLock, setSessionLock] = useState(DEFAULTS.sessionLock);
    const [localRateDiff, setLocalRateDiff] = useState(DEFAULTS.rateDiff);
    const [isBetLockSubmitting, setIsBetLockSubmitting] = useState(false);
    const [isSessionLockSubmitting, setIsSessionLockSubmitting] = useState(false);
    const [isRateDiffSubmitting, setIsRateDiffSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const applySettings = useCallback((settings) => {
        if (!settings) return;
        setBetLock(settings.betLock ? "Lock" : "Unlock");
        setMode(settings.mode || DEFAULTS.mode);
        setSessionLock(settings.sessionLock ? "Lock" : "Unlock");
        setLocalRateDiff(String(settings.rateDiff || DEFAULTS.rateDiff));
        setRateDiff?.(settings.rateDiff || Number(DEFAULTS.rateDiff));
    }, [setRateDiff]);

    const applyDefaults = useCallback(() => {
        setBetLock(DEFAULTS.betLock);
        setMode(DEFAULTS.mode);
        setSessionLock(DEFAULTS.sessionLock);
        setLocalRateDiff(DEFAULTS.rateDiff);
        setRateDiff?.(Number(DEFAULTS.rateDiff));
    }, [setRateDiff]);

    useEffect(() => {
        if (!matchId) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIsLoading(false);
            setError("No match ID provided in URL");
            return;
        }
        if (!settingsLoaded) return;

        if (initialSettings) applySettings(initialSettings);
        else applyDefaults();
        setIsLoading(false);
    }, [applyDefaults, applySettings, initialSettings, matchId, settingsLoaded]);

    const fetchSettings = async () => {
        if (!matchId) return;
        setIsLoading(true);
        setError(null);
        try {
            const response = await apiClient.get(`/manual/settings/${matchId}`);
            if (response.data?.success && response.data?.data) {
                applySettings(response.data.data);
            } else {
                applyDefaults();
            }
        } catch (requestError) {
            if (requestError.response?.status === 404) {
                applyDefaults();
                setError(null);
            } else {
                setError(
                    requestError.response?.data?.message || requestError.message || "Failed to load settings"
                );
            }
        } finally {
            setIsLoading(false);
        }
    };

    const submitSettings = async (payload, setSubmitting, fallbackMessage) => {
        if (!matchId) return;
        setSubmitting(true);
        setError(null);
        try {
            const response = await apiClient.post("/manual/settings/update", {
                matchId,
                ...payload,
            });
            if (!response.data?.success) {
                throw new Error(response.data?.message || "Update failed");
            }
            applySettings(response.data.data);
        } catch (requestError) {
            setError(
                requestError.response?.data?.message || requestError.message || fallbackMessage
            );
        } finally {
            setSubmitting(false);
        }
    };

    const submitBetLock = () => submitSettings(
        { betLock: betLock === "Lock", mode },
        setIsBetLockSubmitting,
        "Failed to update bet lock"
    );

    const submitSessionLock = () => submitSettings(
        { sessionLock: sessionLock === "Lock" },
        setIsSessionLockSubmitting,
        "Failed to update session lock"
    );

    const submitRateDiff = () => submitSettings(
        { rateDiff: Number(localRateDiff) },
        setIsRateDiffSubmitting,
        "Failed to update rate difference"
    );

    return {
        betLock,
        setBetLock,
        mode,
        setMode,
        sessionLock,
        setSessionLock,
        localRateDiff,
        setLocalRateDiff,
        isBetLockSubmitting,
        isSessionLockSubmitting,
        isRateDiffSubmitting,
        isAnySubmitting: isBetLockSubmitting || isSessionLockSubmitting || isRateDiffSubmitting,
        isLoading,
        error,
        fetchSettings,
        submitBetLock,
        submitSessionLock,
        submitRateDiff,
    };
}
