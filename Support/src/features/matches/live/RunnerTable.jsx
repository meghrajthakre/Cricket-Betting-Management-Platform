import { useState } from "react";
import { C, RUNNERS_INIT } from "./constants";

export default function RunnerTable() {
  const [runners, setRunners] = useState(RUNNERS_INIT);

  const toggle = (i) =>
    setRunners((p) =>
      p.map((r, idx) =>
        idx === i ? { ...r, status: r.status === "open" ? "suspend" : "open" } : r
      )
    );

  return (
    <div className="flex justify-center mb-4">
      <div className="overflow-hidden rounded border border-gray-300 w-full ">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th
                className="py-2 px-6 text-white text-center font-bold text-xs uppercase tracking-wide w-1/5"
                style={{ background: C.headerBg }}
              >
                RUNNER
              </th>
              <th
                className="py-2 px-4 text-center font-bold text-xs uppercase w-1/5"
                style={{ background: C.laGaiBg, color: "#1a3a5c" }}
              >
                LAGAI
              </th>
              <th
                className="py-2 px-4 text-center font-bold text-xs uppercase w-1/5"
                style={{ background: C.khaiBg, color: "#7a1a2e" }}
              >
                KHAI
              </th>
              <th
                className="py-2 px-4 text-center font-bold text-xs w-1/5"
                style={{ background: C.actionHeader, color: "#333" }}
              >
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {runners.map((r, i) => (
              <tr key={r.name} className="border-t border-gray-200 bg-white">
                <td className="py-2 px-6 text-center text-gray-800 font-bold">{r.name}</td>
                <td
                  className="py-2 px-4 text-center font-bold text-gray-900"
                  style={{ background: C.laGaiCell }}
                >
                  {r.lagai}
                </td>
                <td
                  className="py-2 px-4 text-center font-bold text-gray-900"
                  style={{ background: C.khaiCell }}
                >
                  {r.khai}
                </td>
                <td className="py-2 px-4 text-center">
                  <button
                    onClick={() => toggle(i)}
                    className="text-white text-[15px] font-bold px-2.5 py-0.5 rounded font-medium whitespace-nowrap 
                               transition-all duration-200 ease-in-out 
                               hover:scale-105 hover:shadow-md 
                               active:scale-95 active:shadow-sm
                               cursor-pointer"
                    style={{ background: r.status === "open" ? C.openBtn : C.suspendBtn }}
                  >
                    {r.status === "open" ? "Open Rate" : "Suspend Rate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}