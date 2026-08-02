import { useState } from "react";
import { C, MANAGEMENT_INIT } from "./constants";

export default function SessionManagement() {
  const [sessions, setSessions] = useState(MANAGEMENT_INIT);

  const toggleVisible = (i) =>
    setSessions((p) =>
      p.map((s, idx) =>
        idx === i
          ? { ...s, visible: !s.visible, status: !s.visible ? "Showing" : "Not" }
          : s
      )
    );

  const updateDiff = (i, val) => {
    // allow empty string while typing, clamp 0–10 on valid numbers
    if (val === "" || val === "-") {
      setSessions((p) => p.map((s, idx) => (idx === i ? { ...s, diff: val } : s)));
      return;
    }
    const num = Number(val);
    if (isNaN(num)) return;
    const clamped = Math.min(10, Math.max(0, num));
    setSessions((p) => p.map((s, idx) => (idx === i ? { ...s, diff: String(clamped) } : s)));
  };

  const selectCls =
    "border border-gray-300 rounded px-1.5 py-0.5 text-xs bg-white text-gray-700 focus:outline-none";

  // Rate Diff values from screenshot
  const rateDiffValues = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  return (
    <>
      {/* Options / Delete Session */}
      <div className="flex justify-center gap-4 mb-4">
        <button
          className="text-white text-sm font-semibold px-8 py-2 rounded"
          style={{ background: C.optionsBtn }}
        >
          Options
        </button>
        <button
          className="text-white text-sm font-semibold px-8 py-2 rounded"
          style={{ background: C.deleteBtn }}
        >
          Delete Session
        </button>
      </div>

      {/* Table */}
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
            {sessions.map((s, i) => (
              <tr
                key={s.name}
                className="border-b text-[15px] border-gray-100 bg-white hover:bg-gray-200"
              >
                {/* Session name */}
                <td className="px-3 py-2 text-gray-800 whitespace-nowrap">{s.name}</td>

                {/* Status */}
                <td
                  className="px-3 py-2 font-medium whitespace-nowrap"
                  style={{ color: s.status === "Showing" ? C.showingText : C.notText }}
                >
                  {s.status}
                </td>

                {/* Lock/Unlock */}
                <td className="px-3 py-2">
                  <select className={selectCls}>
                    <option>Unlock</option>
                    <option>Lock</option>
                  </select>
                </td>

                {/* Rate Diff — dropdown with values 1-10 from screenshot */}
                <td className="px-3 py-2 text-center whitespace-nowrap font-medium text-gray-900">
                  <select 
                    value={s.diff} 
                    onChange={(e) => updateDiff(i, e.target.value)}
                    className="border border-gray-300 rounded px-1.5 py-0.5 text-xs bg-white focus:outline-none"
                    style={{ width: "55px" }}
                  >
                    {rateDiffValues.map(val => (
                      <option key={val} value={val}>{val}</option>
                    ))}
                  </select>
                </td>

                {/* Group */}
                <td className="px-3 py-2">
                  <select className={selectCls}>
                    <option>Select</option>
                    <option>Group A</option>
                    <option>Group B</option>
                  </select>
                </td>

                {/* Max Amt */}
                <td className="px-3 py-2">
                  <select className={selectCls}>
                    <option>Select</option>
                    <option>1000</option>
                    <option>5000</option>
                    <option>10000</option>
                  </select>
                </td>

                {/* Odd Even */}
                <td className="px-3 py-2">
                  <select className={selectCls}>
                    <option>No</option>
                    <option>Yes</option>
                  </select>
                </td>

                {/* Action — Hide (red) / Show (blue) */}
                <td className="px-3 py-2">
                  <button
                    onClick={() => toggleVisible(i)}
                    className="text-xs font-medium underline whitespace-nowrap"
                    style={{ color: s.visible ? C.notText : "#2563eb" }}
                  >
                    {s.visible ? "Hide" : "Show"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}