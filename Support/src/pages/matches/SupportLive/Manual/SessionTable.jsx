import { C } from "./constants";

// RunnerTable's exact button treatment (hover scale/brightness, active
// press, shadow) so these two top buttons feel consistent with it.
const actionBtnCls =
    "text-white font-bold rounded px-3 py-2 transition-all duration-200 hover:scale-105 hover:brightness-110 active:scale-95 active:brightness-90 shadow-sm hover:shadow-md";

// Sessions and their visibility now come entirely from the parent
// (ManualPage) - this table no longer owns any session data itself, and no
// longer renders a hardcoded list. Only sessions marked visible in
// SessionManagement (via the "Show" button) ever show up here.
export default function SessionTable({ sessions, onToggleSuspend, onSuspendAll, onOpenAll }) {
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
                                className={actionBtnCls}
                                style={{ background: C.suspendBtn, cursor: "pointer" }}
                            >
                                Suspend Rate
                            </button>
                        </td>
                        <td className="py-2 px-3 text-center">
                            <button
                                onClick={onOpenAll}
                                className={actionBtnCls}
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
                            <tr key={s.name} className="border-t border-gray-200 bg-white font-medium">
                                <td className="py-2.5 px-4 text-gray-700 font-bold">{s.name}</td>
                                <td className="py-2 px-3 text-center" style={{ background: C.laGaiCell }}>
                                    <div className="font-bold text-gray-900">{s.noRun}</div>
                                    <div className="text-xs text-gray-500">{s.noRate}</div>
                                </td>
                                <td className="py-2 px-3 text-center font-bold" style={{ background: C.khaiCell }}>
                                    <div className="font-bold text-gray-900">{s.yesRun}</div>
                                    <div className="text-xs text-gray-500">{s.yesRate}</div>
                                </td>
                                <td className="py-2 px-3 text-center">
                                    <button
                                        onClick={() => onToggleSuspend(s.name)}
                                        className="text-white text-xs px-3 py-1 rounded font-medium"
                                        style={{ background: C.suspendBtn }}
                                    >
                                        {s.suspended ? "Suspended" : "Suspend"}
                                    </button>
                                </td>
                                <td className="py-2 px-3 text-center">
                                    <button
                                        onClick={() => onToggleSuspend(s.name)}
                                        className="text-white text-xs px-3 py-1 rounded font-medium"
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