import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiClient } from "../../../../services/api";
import { getManualOptions, settleManualTie, settleManualToss, updateManualOptions } from "../../../../services/manualOptionsService";
import { getPendingBetSessions, settleSession } from "../../../../services/sessionService";
import "./Options.css";

const inputClass = "h-12 w-full rounded-md border border-slate-300 bg-white px-4 text-lg text-slate-800 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100";
const headerCell = "border border-slate-300 bg-[#f2f2f2] px-4 py-4 text-left text-lg font-semibold text-slate-900";
const labelCell = "border border-slate-300 bg-white px-4 py-4 text-lg text-slate-900";
const actionCell = "border border-slate-300 bg-white px-4 py-4";

function ActionButton({ children = "Submit", onClick, disabled = false }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="min-h-12 rounded-md bg-[#49a3bb] px-5 py-2 text-lg font-medium text-white transition hover:bg-[#378da5] focus:outline-none focus:ring-2 focus:ring-cyan-300"
        >
            {disabled ? "Saving..." : children}
        </button>
    );
}

function TableShell({ children, minWidth = "700px", summary = false }) {
    return (
        <div className="mb-4 overflow-x-auto sm:mb-5">
            <table className={`options-table w-full border-collapse ${summary ? "options-summary-table" : "options-data-table"}`} style={{ minWidth }}>
                {children}
            </table>
        </div>
    );
}

export default function Options() {
    const { matchId } = useParams();
    const navigate = useNavigate();
    const [teamName, setTeamName] = useState("Team");
    const [savedSection, setSavedSection] = useState("");
    const [savingSection, setSavingSection] = useState("");
    const [requestError, setRequestError] = useState("");
    const [sessions, setSessions] = useState([]);
    const [sessionResults, setSessionResults] = useState({});
    const [values, setValues] = useState({
        tossWinMessage: "",
        errorMessage: "",
        tieResult: "",
        balls: "120",
        newTarget: "",
        matchDelay: "4",
        sessionDelay: "7",
        matchMaxBet: "100000",
        sessionMaxBet: "100000",
        sessionRateDifference: "1",
        tossVisibility: "remove",
        tossResult: "",
    });

    const refreshPendingSessions = useCallback(async () => {
        if (!matchId) return;
        const response = await getPendingBetSessions(matchId);
        setSessions(response.data?.data?.sessions || []);
    }, [matchId]);

    useEffect(() => {
        if (!matchId) return;
        let cancelled = false;

        Promise.all([
            apiClient.get(`/matches/saved/${matchId}`),
            getManualOptions(matchId),
            getPendingBetSessions(matchId),
        ])
            .then(([matchResponse, optionsResponse, sessionsResponse]) => {
                if (cancelled) return;
                setTeamName(matchResponse.data?.data?.homeTeam || "Team");
                const options = optionsResponse.data?.data;
                if (options) {
                    setValues((current) => ({
                        ...current,
                        ...options,
                        newTarget: options.newTarget ?? "",
                    }));
                }
                setSessions(sessionsResponse.data?.data?.sessions || []);
            })
            .catch((error) => {
                console.error("Failed to load match options:", error);
                if (!cancelled) setRequestError(error.response?.data?.message || "Failed to load options");
            });

        return () => {
            cancelled = true;
        };
    }, [matchId]);

    useEffect(() => {
        if (!matchId) return undefined;
        const eventSource = new EventSource(
            `${apiClient.defaults.baseURL}/manual/events?matchId=${encodeURIComponent(matchId)}`
        );
        eventSource.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (
                    message.payload?.matchId === matchId &&
                    ["SESSION_BET_PLACED", "SESSION_SETTLED"].includes(message.type)
                ) {
                    refreshPendingSessions().catch(() => {});
                }
            } catch {
                // Ignore malformed SSE events; the normal page refresh still works.
            }
        };
        return () => eventSource.close();
    }, [matchId, refreshPendingSessions]);

    const updateValue = (field) => (event) => {
        setValues((current) => ({ ...current, [field]: event.target.value }));
    };

    const saveSection = async (section, request) => {
        if (savingSection) return;
        setSavingSection(section);
        setRequestError("");
        try {
            const response = await request();
            const options = response.data?.data;
            if (options) {
                setValues((current) => ({ ...current, ...options, newTarget: options.newTarget ?? "" }));
            }
            setSavedSection(section);
            window.setTimeout(() => setSavedSection(""), 1800);
        } catch (error) {
            setRequestError(error.response?.data?.message || error.message || "Could not save options");
        } finally {
            setSavingSection("");
        }
    };

    const submitSessionResult = async (session) => {
        const resultRun = Number(sessionResults[session.id]);
        if (!Number.isFinite(resultRun) || resultRun < 0 || savingSection) {
            setRequestError("Valid session result run enter karein");
            return;
        }
        if (!window.confirm(`${session.sessionName} ko ${resultRun} runs par settle karna hai?`)) return;

        const section = `Session:${session.id}`;
        setSavingSection(section);
        setRequestError("");
        try {
            const response = await settleSession(matchId, session.id, resultRun);
            const settled = response.data?.data?.session;
            if (settled) {
                setSessions((current) => current.filter((item) => item.id !== settled.id));
            }
            setSavedSection(`${session.sessionName} settled`);
            window.setTimeout(() => setSavedSection(""), 1800);
        } catch (error) {
            setRequestError(error.response?.data?.message || error.message || "Session settle nahi hua");
        } finally {
            setSavingSection("");
        }
    };

    return (
        <main className="min-h-screen bg-[#f4f4f4] px-2 py-3 sm:px-5 sm:py-5">
            <div className="mx-auto max-w-5xl">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={() => navigate(`/support/matches/${matchId}/manual`)}
                        className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                        ← Back to Manual
                    </button>
                    {savedSection && (
                        <span className="text-sm font-xs text-emerald-700">{savedSection} submitted</span>
                    )}
                </div>

                {requestError && (
                    <div className="mb-4 rounded border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                        {requestError}
                    </div>
                )}

                <TableShell>
                    <thead><tr><th className={headerCell}>Toss/Win Message</th><th className={headerCell}>Action</th></tr></thead>
                    <tbody><tr><td data-label="Toss/Win Message" className={labelCell}><input value={values.tossWinMessage} onChange={updateValue("tossWinMessage")} className={inputClass} /></td><td data-label="Action" className={actionCell}><ActionButton disabled={savingSection === "Toss/Win message"} onClick={() => saveSection("Toss/Win message", () => updateManualOptions(matchId, { tossWinMessage: values.tossWinMessage, tossVisibility: "show" }))} /></td></tr></tbody>
                </TableShell>

                <TableShell>
                    <thead><tr><th className={headerCell}>Error Message</th><th className={headerCell}>Action</th></tr></thead>
                    <tbody><tr><td data-label="Error Message" className={labelCell}><input value={values.errorMessage} onChange={updateValue("errorMessage")} className={inputClass} /></td><td data-label="Action" className={actionCell}><ActionButton disabled={savingSection === "Error message"} onClick={() => saveSection("Error message", () => updateManualOptions(matchId, { errorMessage: values.errorMessage }))} /></td></tr></tbody>
                </TableShell>

                <TableShell minWidth="0" summary>
                    <thead><tr><th className={labelCell}>Session</th><th className={labelCell}>Run</th><th className={labelCell}>Action</th></tr></thead>
                    <tbody>
                        {sessions.map((session) => {
                            const settled = session.resultStatus === "settled";
                            const section = `Session:${session.id}`;
                            return (
                                <tr key={session.id}>
                                    <td className={labelCell}>
                                        {session.sessionName}
                                        <span className="ml-2 text-sm font-semibold text-cyan-700">
                                            ({session.pendingBetCount} bets)
                                        </span>
                                    </td>
                                    <td className={labelCell}>
                                        <input
                                            type="number"
                                            min="0"
                                            step="1"
                                            value={settled ? session.resultRun : (sessionResults[session.id] ?? "")}
                                            onChange={(event) => setSessionResults((current) => ({
                                                ...current,
                                                [session.id]: event.target.value,
                                            }))}
                                            disabled={settled}
                                            placeholder="Result run"
                                            className={inputClass}
                                        />
                                    </td>
                                    <td className={actionCell}>
                                        {settled ? (
                                            <span className="font-semibold text-emerald-700">
                                                Settled: {session.resultRun}
                                            </span>
                                        ) : (
                                            <ActionButton
                                                disabled={savingSection === section}
                                                onClick={() => submitSessionResult(session)}
                                            >
                                                Settle Session
                                            </ActionButton>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        {sessions.length === 0 && (
                            <tr>
                                <td colSpan="3" className={labelCell}>
                                    No pending user session bets
                                </td>
                            </tr>
                        )}
                    </tbody>
                </TableShell>

                <TableShell>
                    <thead><tr><th className={headerCell}>Team</th><th className={headerCell}>Option</th><th className={headerCell}>Status</th></tr></thead>
                    <tbody><tr><td data-label="Team" className={labelCell}>Match Tie</td><td data-label="Option" className={labelCell}><select value={values.tieResult} onChange={updateValue("tieResult")} className="border border-slate-500 bg-white px-2 py-1 text-base"><option value="">Select Result</option><option value="tie">Tie</option><option value="no-tie">No Tie</option></select></td><td data-label="Status" className={actionCell}><ActionButton disabled={savingSection === "Tie result"} onClick={() => saveSection("Tie result", () => settleManualTie(matchId, values.tieResult))}>Settle Tie</ActionButton></td></tr></tbody>
                </TableShell>

                <TableShell>
                    <thead><tr><th className={labelCell}>Balls</th><th className={labelCell}>NEW Target (Only add in case of Rain)</th><th className={labelCell}>Action</th></tr></thead>
                    <tbody><tr><td data-label="Balls" className={labelCell}><input type="number" value={values.balls} onChange={updateValue("balls")} className={inputClass} /></td><td data-label="New Target" className={labelCell}><input type="number" value={values.newTarget} onChange={updateValue("newTarget")} className={inputClass} /></td><td data-label="Action" className={actionCell}><ActionButton disabled={savingSection === "Target"} onClick={() => saveSection("Target", () => updateManualOptions(matchId, { balls: values.balls, newTarget: values.newTarget }))}/></td></tr></tbody>
                </TableShell>

                <TableShell minWidth="900px">
                    <thead><tr><th className={labelCell}>Match Delay</th><th className={labelCell}>Session Delay</th><th className={labelCell}>Match Max Bet</th><th className={labelCell}>Session Max Bet</th><th className={labelCell}>Action</th></tr></thead>
                    <tbody><tr>{[["matchDelay", "Match Delay"], ["sessionDelay", "Session Delay"], ["matchMaxBet", "Match Max Bet"], ["sessionMaxBet", "Session Max Bet"]].map(([field, label]) => <td key={field} data-label={label} className={labelCell}><input type="number" value={values[field]} onChange={updateValue(field)} className={inputClass} /></td>)}<td data-label="Action" className={actionCell}><ActionButton disabled={savingSection === "Limits"} onClick={() => saveSection("Limits", () => updateManualOptions(matchId, { matchDelay: values.matchDelay, sessionDelay: values.sessionDelay, matchMaxBet: values.matchMaxBet, sessionMaxBet: values.sessionMaxBet }))}/></td></tr></tbody>
                </TableShell>

                <TableShell>
                    <thead><tr><th className={labelCell}>Name</th><th className={labelCell}>Diff</th><th className={labelCell}>Action</th></tr></thead>
                    <tbody><tr><td data-label="Name" className={labelCell}>Session Rate Difference</td><td data-label="Diff" className={labelCell}><select value={values.sessionRateDifference} onChange={updateValue("sessionRateDifference")} className="w-44 border border-slate-500 bg-white px-2 py-1 text-base">{Array.from({ length: 10 }, (_, index) => index + 1).map((number) => <option key={number} value={number}>{number}</option>)}</select></td><td data-label="Action" className={actionCell}><ActionButton disabled={savingSection === "Session rate difference"} onClick={() => saveSection("Session rate difference", () => updateManualOptions(matchId, { sessionRateDifference: values.sessionRateDifference }))}/></td></tr></tbody>
                </TableShell>

                <TableShell>
                    <thead><tr><th className={labelCell}>Name</th><th className={labelCell}>Status</th><th className={labelCell}>Action</th></tr></thead>
                    <tbody><tr><td data-label="Name" className={labelCell}>Toss Show/Suspend</td><td data-label="Status" className={labelCell}><select value={values.tossVisibility} onChange={updateValue("tossVisibility")} className="w-32 border border-slate-500 bg-white px-2 py-1 text-base"><option value="remove">Remove</option><option value="show">Show</option><option value="suspend">Suspend</option></select></td><td data-label="Action" className={actionCell}><ActionButton disabled={savingSection === "Toss visibility"} onClick={() => saveSection("Toss visibility", () => updateManualOptions(matchId, { tossVisibility: values.tossVisibility }))}/></td></tr></tbody>
                </TableShell>

                <TableShell>
                    <thead><tr><th className={headerCell}>Team</th><th className={headerCell}>Option</th><th className={headerCell}>Status</th></tr></thead>
                    <tbody><tr><td data-label="Team" className={labelCell}>{teamName}</td><td data-label="Option" className={labelCell}><select value={values.tossResult} onChange={updateValue("tossResult")} className="border border-slate-500 bg-white px-2 py-1 text-base"><option value="">Select Result</option><option value="won">Won Toss</option><option value="lost">Lost Toss</option></select></td><td data-label="Status" className={actionCell}><ActionButton disabled={savingSection === "Toss result"} onClick={() => saveSection("Toss result", () => settleManualToss(matchId, values.tossResult, teamName))}>Settle Toss</ActionButton></td></tr></tbody>
                </TableShell>
            </div>
        </main>
    );
}
