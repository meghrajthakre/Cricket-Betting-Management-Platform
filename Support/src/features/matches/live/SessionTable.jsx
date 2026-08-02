import { useState } from "react";
import { C, SESSIONS_INIT } from "./constants";

export default function SessionTable() {
  const [sessions, setSessions] = useState(SESSIONS_INIT);

  const toggle = (i) =>
    setSessions((p) =>
      p.map((s, idx) => (idx === i ? { ...s, suspended: !s.suspended } : s))
    );

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
          {/* Global action row */}
          <tr className="border-t border-gray-200 bg-white">
            <td className="py-2 px-3" />
            <td className="py-2 px-3" style={{ background: C.laGaiCell }} />
            <td className="py-2 px-3" style={{ background: C.khaiCell }} />
            <td className="py-2 px-3 text-center">
              <button
                onClick={() => setSessions((p) => p.map((s) => ({ ...s, suspended: true })))}
                className="text-white text-xs px-3 py-1 rounded font-medium"
                style={{ background: C.suspendBtn }}
              >
                Suspend Rate
              </button>
            </td>
            <td className="py-2 px-3 text-center">
              <button
                onClick={() => setSessions((p) => p.map((s) => ({ ...s, suspended: false })))}
                className="text-white text-xs px-3 py-1 rounded font-medium"
                style={{ background: C.openBtn }}
              >
                Open Rate
              </button>
            </td>
          </tr>

          {sessions.map((s, i) => (
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
                  onClick={() => toggle(i)}
                  className="text-white text-xs px-3 py-1 rounded font-medium"
                  style={{ background: C.suspendBtn }}
                >
                  {s.suspended ? "Suspended" : "Suspend"}
                </button>
              </td>
              <td className="py-2 px-3 text-center">
                <button
                  onClick={() => toggle(i)}
                  className="text-white text-xs px-3 py-1 rounded font-medium"
                  style={{ background: C.openBtn }}
                >
                  Open
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}