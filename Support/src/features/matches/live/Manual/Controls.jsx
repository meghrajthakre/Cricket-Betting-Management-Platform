import { useParams } from "react-router-dom";
import BetLockControl from "./controls/BetLockControl";
import RateDifferenceControl from "./controls/RateDifferenceControl";
import SessionLockControl from "./controls/SessionLockControl";
import { useManualSettingsControls } from "./hooks/useManualSettingsControls";

export default function Controls({ setRateDiff, initialSettings, settingsLoaded }) {
    const { matchId } = useParams();
    const controls = useManualSettingsControls({
        matchId,
        initialSettings,
        settingsLoaded,
        setRateDiff,
    });

    if (controls.error && !controls.isLoading) {
        return (
            <div className="border border-red-300 rounded overflow-hidden mb-4 p-4 bg-red-50">
                <div className="flex items-center gap-2 text-red-600">
                    <span className="text-sm font-medium">{controls.error}</span>
                </div>
                <button type="button" onClick={controls.fetchSettings} className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium">
                    Retry
                </button>
            </div>
        );
    }

    if (controls.isLoading) {
        return (
            <div className="border border-gray-200 rounded overflow-hidden mb-4 p-4 text-center">
                <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                    <span className="text-gray-500">Loading settings...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="border border-gray-200 rounded overflow-hidden mb-4">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 text-xs text-gray-500">
                Match ID: {matchId}
            </div>
            <BetLockControl
                betLock={controls.betLock}
                setBetLock={controls.setBetLock}
                mode={controls.mode}
                setMode={controls.setMode}
                disabled={controls.isAnySubmitting}
                isSubmitting={controls.isBetLockSubmitting}
                onSubmit={controls.submitBetLock}
            />
            <SessionLockControl
                sessionLock={controls.sessionLock}
                setSessionLock={controls.setSessionLock}
                disabled={controls.isAnySubmitting}
                isSubmitting={controls.isSessionLockSubmitting}
                onSubmit={controls.submitSessionLock}
            />
            <RateDifferenceControl
                rateDiff={controls.localRateDiff}
                setRateDiff={controls.setLocalRateDiff}
                disabled={controls.isAnySubmitting}
                isSubmitting={controls.isRateDiffSubmitting}
                onSubmit={controls.submitRateDiff}
            />
        </div>
    );
}
