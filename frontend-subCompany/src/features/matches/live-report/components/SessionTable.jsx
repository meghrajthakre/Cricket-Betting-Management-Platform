import { useState } from "react";
import { buildSessionLadder, formatNumber } from "../utils/reportCalculations";
import ProfitLoss from "./ProfitLoss";

export default function SessionTable({ sessions, bets }) {
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const selectedSession = sessions.find(
    (session) => session.id === selectedSessionId,
  );
  const selectedSessionBets = selectedSession
    ? bets.filter(
        (bet) =>
          bet.marketType === "session" &&
          bet.marketId === selectedSession.id &&
          bet.status === "pending",
      )
    : [];
  const selectedLadder = selectedSessionBets.length
    ? buildSessionLadder(selectedSession, bets)
    : [];

  return (
    <section className="overflow-hidden rounded-lg border border-(--color-border) bg-white shadow-sm">
      <div className="bg-(--color-banner) px-4 py-2 text-center text-sm font-bold text-white">
        Running Session
      </div>
      <div className="overflow-hidden">
        <table className="w-full table-fixed border-collapse text-[10px] sm:text-sm">
          <thead>
            <tr>
              <th className="w-[40%] bg-(--color-primary) px-2 py-2 text-left font-semibold text-white sm:px-4 sm:py-3">
                SESSION
              </th>
              <th className="w-[20%] bg-blue-200 px-1 py-2 text-center font-semibold text-gray-800 sm:px-4 sm:py-3">
                NO RUN
              </th>
              <th className="w-[20%] bg-pink-200 px-1 py-2 text-center font-semibold text-gray-800 sm:px-4 sm:py-3">
                YES RUN
              </th>
              <th className="w-[20%] bg-(--color-primary) px-1 py-2 text-center font-semibold text-white sm:px-4 sm:py-3">
                AMOUNT
              </th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => {
              const selected = selectedSessionId === session.id;
              const isSuspended = session.status !== "open";
              const sessionBets = bets.filter(
                (bet) =>
                  bet.marketType === "session" && bet.marketId === session.id,
              );
              const totalAmount = sessionBets.reduce(
                (total, bet) => total + Number(bet.amount || 0),
                0,
              );
              const hasPendingBets = sessionBets.some(
                (bet) => bet.status === "pending",
              );

              return (
                <tr
                  key={session.id}
                  onClick={() => {
                    if (!hasPendingBets) {
                      window.alert("Is session par koi bet nahi lagi hai.");
                      return;
                    }
                    setSelectedSessionId(selected ? null : session.id);
                  }}
                  className={`cursor-pointer transition-colors ${
                    selected ? "bg-blue-50" : "hover:bg-blue-50"
                  }`}
                >
                  <td
                    className="truncate border border-gray-200 px-2 py-3 font-semibold text-(--color-primary) sm:px-4"
                    title={session.sessionName}
                  >
                    {session.sessionName}
                  </td>
                  <td className="border border-gray-200 bg-blue-100 px-1 py-3 text-center sm:px-4">
                    <div className="font-bold">
                      {isSuspended ? 0 : session.noRun}
                    </div>
                    <div className="text-xs font-semibold">
                      {isSuspended ? "0.0" : session.noRate}
                    </div>
                  </td>
                  <td className="border border-gray-200 bg-pink-200 px-1 py-3 text-center sm:px-4">
                    <div className="font-bold">
                      {isSuspended ? 0 : session.yesRun}
                    </div>
                    <div className="text-xs font-semibold">
                      {isSuspended ? "0.0" : session.yesRate}
                    </div>
                  </td>
                  <td className="border border-gray-200 px-1 py-3 text-center font-bold text-(--color-primary) sm:px-4">
                    {formatNumber(totalAmount)}
                  </td>
                </tr>
              );
            })}
            {!sessions.length && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  Running session abhi available nahi hai.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedSession && (
        <div className="border-t-4 border-(--color-bg-main) bg-[#f8fafc] p-2 sm:p-4">
          <div className="mb-2 bg-(--color-primary) px-3 py-2 text-center text-xs font-bold text-white sm:text-sm">
            {selectedSession.sessionName} - Live Position
          </div>
          <table className="w-full table-fixed border-collapse text-xs sm:text-sm">
            <thead>
              <tr>
                <th className="bg-[#4c89a8] px-3 py-2 text-center text-white">
                  RUN
                </th>
                <th className="bg-[#4c89a8] px-3 py-2 text-center text-white">
                  LIVE POSITION
                </th>
              </tr>
            </thead>
            <tbody>
              {selectedLadder.map((row) => (
                <tr key={row.run}>
                  <td className="border-2 border-gray-200 bg-white px-3 py-3 text-center font-semibold text-(--color-primary)">
                    {row.run}
                  </td>
                  <td className="border-2 border-gray-200 bg-white px-3 py-3 text-center">
                    <ProfitLoss value={row.position} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
