import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiClient } from "../../../../services/api";
import "./Options.css";

const inputClass = "h-12 w-full rounded-md border border-slate-300 bg-white px-4 text-lg text-slate-800 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100";
const headerCell = "border border-slate-300 bg-[#f2f2f2] px-4 py-4 text-left text-lg font-semibold text-slate-900";
const labelCell = "border border-slate-300 bg-white px-4 py-4 text-lg text-slate-900";
const actionCell = "border border-slate-300 bg-white px-4 py-4";

function ActionButton({ children = "Submit", onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="min-h-12 rounded-md bg-[#49a3bb] px-5 py-2 text-lg font-medium text-white transition hover:bg-[#378da5] focus:outline-none focus:ring-2 focus:ring-cyan-300"
        >
            {children}
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

    useEffect(() => {
        if (!matchId) return;
        let cancelled = false;

        apiClient.get(`/matches/saved/${matchId}`)
            .then(({ data }) => {
                if (!cancelled) setTeamName(data?.data?.homeTeam || "Team");
            })
            .catch((error) => console.error("Failed to load match for options:", error));

        return () => {
            cancelled = true;
        };
    }, [matchId]);

    const updateValue = (field) => (event) => {
        setValues((current) => ({ ...current, [field]: event.target.value }));
    };

    const markSaved = (section) => {
        setSavedSection(section);
        window.setTimeout(() => setSavedSection(""), 1800);
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

                <TableShell>
                    <thead><tr><th className={headerCell}>Toss/Win Message</th><th className={headerCell}>Action</th></tr></thead>
                    <tbody><tr><td data-label="Toss/Win Message" className={labelCell}><input value={values.tossWinMessage} onChange={updateValue("tossWinMessage")} className={inputClass} /></td><td data-label="Action" className={actionCell}><ActionButton onClick={() => markSaved("Toss/Win message")} /></td></tr></tbody>
                </TableShell>

                <TableShell>
                    <thead><tr><th className={headerCell}>Error Message</th><th className={headerCell}>Action</th></tr></thead>
                    <tbody><tr><td data-label="Error Message" className={labelCell}><input value={values.errorMessage} onChange={updateValue("errorMessage")} className={inputClass} /></td><td data-label="Action" className={actionCell}><ActionButton onClick={() => markSaved("Error message")} /></td></tr></tbody>
                </TableShell>

                <TableShell minWidth="0" summary>
                    <thead><tr><th className={labelCell}>Session</th><th className={labelCell}>Run</th><th className={labelCell}>Action</th></tr></thead>
                </TableShell>

                <TableShell>
                    <thead><tr><th className={headerCell}>Team</th><th className={headerCell}>Option</th><th className={headerCell}>Status</th></tr></thead>
                    <tbody><tr><td data-label="Team" className={labelCell}>Match Tie</td><td data-label="Option" className={labelCell}><select value={values.tieResult} onChange={updateValue("tieResult")} className="border border-slate-500 bg-white px-2 py-1 text-base"><option value="">Select Result</option><option value="tie">Tie</option><option value="no-tie">No Tie</option></select></td><td data-label="Status" className={actionCell}><ActionButton onClick={() => markSaved("Tie result")}>Settle Tie</ActionButton></td></tr></tbody>
                </TableShell>

                <TableShell>
                    <thead><tr><th className={labelCell}>Balls</th><th className={labelCell}>NEW Target (Only add in case of Rain)</th><th className={labelCell}>Action</th></tr></thead>
                    <tbody><tr><td data-label="Balls" className={labelCell}><input type="number" value={values.balls} onChange={updateValue("balls")} className={inputClass} /></td><td data-label="New Target" className={labelCell}><input type="number" value={values.newTarget} onChange={updateValue("newTarget")} className={inputClass} /></td><td data-label="Action" className={actionCell}><ActionButton onClick={() => markSaved("Target")}/></td></tr></tbody>
                </TableShell>

                <TableShell minWidth="900px">
                    <thead><tr><th className={labelCell}>Match Delay</th><th className={labelCell}>Session Delay</th><th className={labelCell}>Match Max Bet</th><th className={labelCell}>Session Max Bet</th><th className={labelCell}>Action</th></tr></thead>
                    <tbody><tr>{[["matchDelay", "Match Delay"], ["sessionDelay", "Session Delay"], ["matchMaxBet", "Match Max Bet"], ["sessionMaxBet", "Session Max Bet"]].map(([field, label]) => <td key={field} data-label={label} className={labelCell}><input type="number" value={values[field]} onChange={updateValue(field)} className={inputClass} /></td>)}<td data-label="Action" className={actionCell}><ActionButton onClick={() => markSaved("Limits")}/></td></tr></tbody>
                </TableShell>

                <TableShell>
                    <thead><tr><th className={labelCell}>Name</th><th className={labelCell}>Diff</th><th className={labelCell}>Action</th></tr></thead>
                    <tbody><tr><td data-label="Name" className={labelCell}>Session Rate Difference</td><td data-label="Diff" className={labelCell}><select value={values.sessionRateDifference} onChange={updateValue("sessionRateDifference")} className="w-44 border border-slate-500 bg-white px-2 py-1 text-base">{Array.from({ length: 10 }, (_, index) => index + 1).map((number) => <option key={number} value={number}>{number}</option>)}</select></td><td data-label="Action" className={actionCell}><ActionButton onClick={() => markSaved("Session rate difference")}/></td></tr></tbody>
                </TableShell>

                <TableShell>
                    <thead><tr><th className={labelCell}>Name</th><th className={labelCell}>Status</th><th className={labelCell}>Action</th></tr></thead>
                    <tbody><tr><td data-label="Name" className={labelCell}>Toss Show/Suspend</td><td data-label="Status" className={labelCell}><select value={values.tossVisibility} onChange={updateValue("tossVisibility")} className="w-32 border border-slate-500 bg-white px-2 py-1 text-base"><option value="remove">Remove</option><option value="show">Show</option><option value="suspend">Suspend</option></select></td><td data-label="Action" className={actionCell}><ActionButton onClick={() => markSaved("Toss visibility")}/></td></tr></tbody>
                </TableShell>

                <TableShell>
                    <thead><tr><th className={headerCell}>Team</th><th className={headerCell}>Option</th><th className={headerCell}>Status</th></tr></thead>
                    <tbody><tr><td data-label="Team" className={labelCell}>{teamName}</td><td data-label="Option" className={labelCell}><select value={values.tossResult} onChange={updateValue("tossResult")} className="border border-slate-500 bg-white px-2 py-1 text-base"><option value="">Select Result</option><option value="won">Won Toss</option><option value="lost">Lost Toss</option></select></td><td data-label="Status" className={actionCell}><ActionButton onClick={() => markSaved("Toss result")}>Settle Toss</ActionButton></td></tr></tbody>
                </TableShell>
            </div>
        </main>
    );
}
