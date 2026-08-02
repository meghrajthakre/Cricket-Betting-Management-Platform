import { C } from "./constants";

// RunnerTable's exact button treatment (hover scale/brightness, active
// press, shadow) so these two top buttons feel consistent with it.
const actionBtnCls =
    "text-white font-bold rounded px-3 py-2 transition-all duration-200 hover:scale-105 hover:brightness-110 active:scale-95 active:brightness-90 shadow-sm hover:shadow-md";

// Sessions and their visibility now come entirely from the parent
// (ManualPage) - this table no longer owns any session data itself, and no
// longer renders a hardcoded list. Only sessions marked visible in
// SessionManagement (via the "Show" button) ever show up here.
export default function SessionTable({
    sessions,
    onUpdateStatus,
    onSuspendAll,
    onOpenAll,
    pendingFields,
    bulkPending,
}) {
    const thBase =
        "py-2.5 px-3 text-center font-semibold text-xs uppercase tracking-wide";

    return (
        <div className="overflow-hidden rounded border border-gray-300 mb-4">
            <table className="w-full text-md border-collapse">
                <thead>
                    <tr>
                        <th className={`${thBase} text-white`} style={{ background: C.headerBg }}>
                            SESSION
                        </th>
                        <th className={thBase} style={{ background: C.laGaiBg, color: "#1a3a5c" }}>
                            NO RUN
                        </th>
                        <th className={thBase} style={{ background: C.khaiBg, color: "#7a1a2e" }}>
                            YES RUN
                        </th>
                        <th className={thBase} style={{ background: C.khaiBg, color: "#7a1a2e" }}>
                            Suspend
                        </th>
                        <th className={thBase} style={{ background: C.laGaiBg, color: "#1a3a5c" }}>
                            Open
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr className="border-t border-gray-200 bg-white">
                        <td className="py-2 px-3" />
                        <td className="py-2 px-3" style={{ background: C.laGaiCell }} />
                        <td className="py-2 px-3" style={{ background: C.khaiCell }} />
                        <td className="py-2 px-3 text-center">
                            <button
                                onClick={onSuspendAll}
                                disabled={bulkPending}
                                className={`${actionBtnCls} disabled:opacity-50`}
                                style={{ background: C.suspendBtn, cursor: "pointer" }}
                            >
                                Suspend Rate
                            </button>
                        </td>
                        <td className="py-2 px-3 text-center">
                            <button
                                onClick={onOpenAll}
                                disabled={bulkPending}
                                className={`${actionBtnCls} disabled:opacity-50`}
                                style={{ background: C.openBtn, cursor: "pointer" }}
                            >
                                Open Rate
                            </button>
                        </td>
                    </tr>

                    {sessions.length === 0 ? (
                        <tr className="border-t border-gray-200 bg-white">
                            <td colSpan={5} className="py-4 px-3 text-center text-sm text-gray-500">
                                No sessions shown yet. Use "Show" in Session Management below to add one here.
                            </td>
                        </tr>
                    ) : (
                        sessions.map((s) => (
                            <tr key={s.id} className="border-t border-gray-200 bg-white font-medium">
                                <td className="py-2.5 px-4 text-gray-700 font-bold">{s.sessionName}</td>
                                <td className="py-2 px-3 text-center" style={{ background: C.laGaiCell }}>
                                    <div className="font-bold text-gray-900">
                                        {s.status === "open" ? s.noRun : 0}
                                    </div>
                                    <div className="text-sm text-gray-900">
                                        {s.status === "open" ? Number(s.noRate).toFixed(1) : "0.0"}
                                    </div>
                                </td>
                                <td className="py-2 px-3 text-center font-bold" style={{ background: C.khaiCell }}>
                                    <div className="font-bold text-gray-900">
                                        {s.status === "open" ? s.yesRun : 0}
                                    </div>
                                    <div className="text-sm text-gray-900">
                                        {s.status === "open" ? Number(s.yesRate).toFixed(1) : "0.0"}
                                    </div>
                                </td>
                                <td className="py-2 px-3 text-center">
                                    <button
                                        disabled={pendingFields.has(`${s.id}:status`)}
                                        onClick={() => onUpdateStatus(s.id, "suspend")}
                                        className="text-white text-xs px-3 py-1 rounded font-medium cursor-pointer transition-all duration-200 hover:brightness-110 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                        style={{ background: C.suspendBtn }}
                                    >
                                        {s.status === "suspend" ? "Suspended" : "Suspend"}
                                    </button>
                                </td>
                                <td className="py-2 px-3 text-center">
                                    <button
                                        disabled={pendingFields.has(`${s.id}:status`)}
                                        onClick={() => onUpdateStatus(s.id, "open")}
                                        className="text-white text-xs px-3 py-1 rounded font-medium cursor-pointer transition-all duration-200 hover:brightness-110 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                        style={{ background: C.openBtn }}
                                    >
                                        Open
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
