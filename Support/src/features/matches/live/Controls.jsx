import { useState } from "react";
import { C } from "./constants";

export default function Controls() {
  const [betLock, setBetLock]         = useState("Unlock");
  const [mode, setMode]               = useState("Lagai");
  const [sessionLock, setSessionLock] = useState("Unlock");
  const [rateDiff, setRateDiff]       = useState("0.02");

  const thCls =
    "text-left px-4 py-2 text-gray-600 font-medium text-sm border-b border-gray-200 bg-white";
  const tdCls = "px-4 py-3 bg-white";

  return (
    <div className="border border-gray-200 rounded overflow-hidden mb-4">

      {/* ── Bet Lock + Mode ── */}
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={thCls}>Bet Lock</th>
            <th className={thCls}>Mode</th>
            <th className={thCls}>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-gray-100">
            <td className={tdCls}>
              <select
                value={betLock}
                onChange={(e) => setBetLock(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white text-gray-700 focus:outline-none w-36"
              >
                <option>Unlock</option>
                <option>Lock</option>
              </select>
            </td>
            <td className={tdCls}>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white text-gray-700 focus:outline-none w-36"
              >
                <option>Lagai</option>
                <option>Khai</option>
              </select>
            </td>
            <td className={tdCls}>
              <button
                className="text-white text-sm font-semibold px-6 py-1.5 rounded"
                style={{ background: C.submitBtn }}
              >
                Submit
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Session Lock/Unlock ── */}
      <table className="w-full border-collapse border-t-2 border-gray-200">
        <thead>
          <tr>
            <th className={thCls}>Session Lock/Unlock</th>
            <th className={thCls}>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-gray-100">
            <td className={tdCls}>
              <select
                value={sessionLock}
                onChange={(e) => setSessionLock(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white text-gray-700 focus:outline-none w-36"
              >
                <option>Unlock</option>
                <option>Lock</option>
              </select>
            </td>
            <td className={tdCls}>
              <button
                className="text-white text-sm font-semibold px-6 py-1.5 rounded"
                style={{ background: C.submitBtn }}
              >
                Submit
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Match Rate Difference ── */}
      <table className="w-full border-collapse border-t-2 border-gray-200">
        <thead>
          <tr>
            <th className={thCls}>Name</th>
            <th className={thCls}>Diff</th>
            <th className={thCls}>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-gray-100">
            <td className={`${tdCls} text-gray-700`}>Match Rate Difference</td>
            <td className={tdCls}>
              <select
                value={rateDiff}
                onChange={(e) => setRateDiff(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white text-gray-700 focus:outline-none w-28"
              >
                <option>0.02</option>
                <option>0.05</option>
                <option>0.10</option>
              </select>
            </td>
            <td className={tdCls}>
              <button
                className="text-white text-sm font-semibold px-6 py-1.5 rounded"
                style={{ background: C.submitBtn }}
              >
                Submit
              </button>
            </td>
          </tr>
        </tbody>
      </table>

    </div>
  );
}