import { C } from "./constants";
import { useNavigate, useParams } from "react-router-dom";

export default function SessionManagement({
    sessions,
    loading,
    error,
    pendingFields,
    onUpdateField,
    onToggleVisible,
    onReverseSettlement,
}) {
    const navigate = useNavigate();
    const { matchId } = useParams();
    const selectCls =
        "border border-gray-300 rounded px-1.5 py-0.5 text-xs bg-white text-gray-700 focus:outline-none";

    const rateDiffValues = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const isPending = (sessionId, field) => pendingFields.has(`${sessionId}:${field}`);
    const activeSessions = sessions
        .filter((session) => session.resultStatus !== "settled")
        .sort((first, second) => Number(second.isVisible) - Number(first.isVisible));
    const settledSessions = sessions
        .filter((session) => session.resultStatus === "settled")
        .sort((first, second) => new Date(second.settledAt || 0) - new Date(first.settledAt || 0));

    return (
        <>
            <div className="flex justify-center gap-4 mb-4">
                <button
                    type="button"
                    onClick={() => navigate(`/support/matches/${matchId}/manual/options`)}
                    className="text-white text-sm font-semibold px-8 py-2 rounded cursor-pointer active:scale-95"
                    style={{ background: C.optionsBtn }}
                >
                    Options
                </button>
                <button
                    className="text-white text-sm font-semibold px-8 py-2 rounded cursor-pointer"
                    style={{ background: C.deleteBtn }}
                >
                    Delete Session
                </button>
            </div>

            <div className="overflow-x-auto rounded border border-gray-200 mb-10">
                <table className="w-full text-xs border-collapse">
                    <thead>
                        <tr className="bg-white border-b border-gray-300">
                            <th className="px-3 py-2.5 text-left font-semibold text-gray-700 whitespace-nowrap">Session</th>
                            <th className="px-3 py-2.5 text-left font-semibold text-gray-700 whitespace-nowrap">Status</th>
                            <th className="px-3 py-2.5 text-left font-semibold text-gray-700 whitespace-nowrap">Lock/Unlock</th>
                            <th className="px-3 py-2.5 text-left font-semibold text-gray-700 whitespace-nowrap">Rate Diff</th>
                            <th className="px-3 py-2.5 text-left font-semibold text-gray-700 whitespace-nowrap">Group</th>
                            <th className="px-3 py-2.5 text-left font-semibold text-gray-700 whitespace-nowrap">Max Amt</th>
                            <th className="px-3 py-2.5 text-left font-semibold text-gray-700 whitespace-nowrap">Odd Even</th>
                            <th className="px-3 py-2.5 text-left font-semibold text-gray-700 whitespace-nowrap">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && (
                            <tr>
                                <td colSpan={8} className="px-3 py-5 text-center text-gray-500">
                                    Loading sessions...
                                </td>
                            </tr>
                        )}
                        {!loading && error && (
                            <tr>
                                <td colSpan={8} className="px-3 py-5 text-center text-red-600">
                                    {error}
                                </td>
                            </tr>
                        )}
                        {!loading && !error && sessions.length === 0 && (
                            <tr>
                                <td colSpan={8} className="px-3 py-5 text-center text-gray-500">
                                    No sessions found.
                                </td>
                            </tr>
                        )}
                        {activeSessions.map((s) => (
                            <tr key={s.id} className="border-b text-[15px] border-gray-100 bg-white hover:bg-gray-50">
                                <td className="px-3 py-2 text-gray-800 whitespace-nowrap">{s.sessionName}</td>

                                <td className="px-3 py-2">
                                    <span
                                        className="font-semibold"
                                        style={{ color: s.isVisible ? C.showingText : C.notText }}
                                    >
                                        {s.isVisible ? "Showing" : "Not"}
                                    </span>
                                </td>

                                <td className="px-3 py-2">
                                    <select
                                        value={s.lockStatus}
                                        disabled={s.resultStatus === "settled" || isPending(s.id, "lockStatus")}
                                        onChange={(e) => onUpdateField(s.id, "lockStatus", e.target.value)}
                                        className={selectCls}
                                    >
                                        <option value="unlock">Unlock</option>
                                        <option value="lock">Lock</option>
                                    </select>
                                </td>

                                <td className="px-3 py-2 text-center whitespace-nowrap font-medium text-gray-900">
                                    <select
                                        value={s.rateDiff}
                                        disabled={s.resultStatus === "settled" || isPending(s.id, "rateDiff")}
                                        onChange={(e) => onUpdateField(s.id, "rateDiff", Number(e.target.value))}
                                        className={selectCls}
                                        style={{ width: "55px" }}
                                    >
                                        {rateDiffValues.map((val) => (
                                            <option key={val} value={val}>{val}</option>
                                        ))}
                                    </select>
                                </td>

                                <td className="px-3 py-2">
                                    <select
                                        value={s.group}
                                        disabled={s.resultStatus === "settled" || isPending(s.id, "group")}
                                        onChange={(e) => onUpdateField(s.id, "group", e.target.value)}
                                        className={selectCls}
                                    >
                                        <option value="default">Default</option>
                                        <option value="group-1">Group 1</option>
                                        <option value="group-2">Group 2</option>
                                    </select>
                                </td>

                                <td className="px-3 py-2">
                                    <select
                                        value={s.maxAmount}
                                        disabled={s.resultStatus === "settled" || isPending(s.id, "maxAmount")}
                                        onChange={(e) => onUpdateField(s.id, "maxAmount", Number(e.target.value))}
                                        className={selectCls}
                                    >
                                        {[0, 1000, 5000, 10000, 500000].map((amount) => (
                                            <option key={amount} value={amount}>{amount}</option>
                                        ))}
                                    </select>
                                </td>

                                <td className="px-3 py-2">
                                    <select
                                        value={s.oddEven}
                                        disabled={s.resultStatus === "settled" || isPending(s.id, "oddEven")}
                                        onChange={(e) => onUpdateField(s.id, "oddEven", e.target.value)}
                                        className={selectCls}
                                    >
                                        <option value="no">No</option>
                                        <option value="yes">Yes</option>
                                    </select>
                                </td>

                                <td className="px-3 py-2">
                                    <button
                                        disabled={isPending(s.id, "isVisible")}
                                        onClick={() => onToggleVisible(s.id, !s.isVisible)}
                                        className="text-xs font-medium underline whitespace-nowrap disabled:opacity-50"
                                        style={{ color: s.isVisible ? C.notText : "#2563eb" }}
                                    >
                                        {s.isVisible ? "Hide" : "Show"}
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {settledSessions.length > 0 && (
                            <>
                                <tr className="border-y border-amber-200 bg-amber-50">
                                    <td colSpan={8} className="px-3 py-2.5 text-sm font-bold text-amber-800">
                                        Settled Sessions ({settledSessions.length})
                                    </td>
                                </tr>
                                <tr className="border-b border-gray-200 bg-gray-50 text-xs text-gray-600">
                                    <th colSpan={2} className="px-3 py-2 text-left font-semibold">Session Name</th>
                                    <th colSpan={2} className="px-3 py-2 text-left font-semibold">Settlement Time</th>
                                    <th colSpan={2} className="px-3 py-2 text-left font-semibold">Settled Number</th>
                                    <th colSpan={2} className="px-3 py-2 text-left font-semibold">Action</th>
                                </tr>
                                {settledSessions.map((s) => (
                                    <tr key={s.id} className="border-b border-gray-100 bg-white text-sm hover:bg-gray-50">
                                        <td colSpan={2} className="px-3 py-2 font-medium text-gray-800">{s.sessionName}</td>
                                        <td colSpan={2} className="px-3 py-2 text-gray-600 whitespace-nowrap">
                                            {s.settledAt ? new Date(s.settledAt).toLocaleString("en-IN") : "-"}
                                        </td>
                                        <td colSpan={2} className="px-3 py-2 font-bold text-emerald-700">{s.resultRun}</td>
                                        <td colSpan={2} className="px-3 py-2">
                                            <button
                                                type="button"
                                                disabled={isPending(s.id, "reverse")}
                                                onClick={() => {
                                                    if (window.confirm(`${s.sessionName} ka settlement reverse karna hai? Winner credits bhi reverse honge.`)) {
                                                        onReverseSettlement(s.id);
                                                    }
                                                }}
                                                className="rounded bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                                            >
                                                {isPending(s.id, "reverse") ? "Reversing..." : "Reverse"}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </>
                        )}
                    </tbody>
                </table>
            </div>
        </>
    );
}
