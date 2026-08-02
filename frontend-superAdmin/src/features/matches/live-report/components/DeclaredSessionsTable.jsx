import { calculateDeclaredSessions } from "../utils/reportCalculations";
import ProfitLoss from "./ProfitLoss";

export default function DeclaredSessionsTable({ sessions, bets }) {
  const rows = calculateDeclaredSessions(sessions, bets);
  const total = rows.reduce((sum, session) => sum + session.plusMinus, 0);

  if (!rows.length) return null;

  return (
    <section className="overflow-hidden rounded-lg border border-(--color-border) bg-white shadow-sm">
      <div className="bg-(--color-banner) px-4 py-2 text-center text-sm font-bold text-white">
        Declared Session
      </div>
      <div className="overflow-hidden">
        <table className="w-full table-fixed border-collapse text-[9px] sm:text-sm">
          <thead>
            <tr>
              <th className="w-[34%] bg-(--color-primary) px-1 py-3 text-center font-semibold text-white sm:px-3">
                SESSION
              </th>
              <th className="w-[18%] bg-(--color-primary) px-1 py-3 text-center font-semibold text-white sm:px-3">
                RUN
              </th>
              <th className="w-[20%] bg-(--color-primary) px-1 py-3 text-center font-semibold text-white sm:px-3">
                +/-
              </th>
              <th className="w-[28%] bg-(--color-primary) px-1 py-3 text-center font-semibold text-white sm:px-3">
                SETTLED TIME
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((session) => (
              <tr key={session.id}>
                <td className="break-words border-2 border-gray-200 px-1 py-3 text-center font-semibold text-(--color-primary) sm:px-3">
                  {session.sessionName}
                </td>
                <td className="border-2 border-gray-200 px-1 py-3 text-center font-semibold sm:px-3">
                  {session.resultRun ?? "-"}
                </td>
                <td className="border-2 border-gray-200 px-1 py-3 text-center sm:px-3">
                  <ProfitLoss value={session.plusMinus} />
                </td>
                <td className="break-words border-2 border-gray-200 px-1 py-3 text-center text-gray-600 sm:px-3">
                  {session.settledAt
                    ? new Date(session.settledAt).toLocaleString("en-IN")
                    : "-"}
                </td>
              </tr>
            ))}
            <tr className="bg-gray-50">
              <td className="border-2 border-gray-200 px-3 py-3" />
              <td className="border-2 border-gray-200 px-3 py-3 text-center font-bold text-(--color-primary)">
                Total
              </td>
              <td className="border-2 border-gray-200 px-3 py-3 text-center">
                <ProfitLoss value={Number(total.toFixed(2))} />
              </td>
              <td className="border-2 border-gray-200 px-3 py-3" />
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
