import ProfitLoss from "./ProfitLoss";

export default function OddsTable({ runners, positions }) {
  return (
    <section className="overflow-hidden rounded-lg border border-(--color-border) bg-white shadow-sm">
      <table className="w-full table-fixed border-collapse text-[10px] sm:text-sm">
        <thead>
          <tr>
            <th className="w-[30%] bg-(--color-primary) px-1 py-2 font-semibold text-white sm:px-4 sm:py-3">
              RUNNER
            </th>
            <th className="w-[22%] bg-blue-200 px-1 py-2 text-center font-semibold text-gray-800 sm:px-4 sm:py-3">
              LAGAI
            </th>
            <th className="w-[22%] bg-pink-200 px-1 py-2 text-center font-semibold text-gray-800 sm:px-4 sm:py-3">
              KHAI
            </th>
            <th className="w-[26%] bg-(--color-primary) px-1 py-2 text-center font-semibold text-white sm:px-4 sm:py-3">
              +/-
            </th>
          </tr>
        </thead>
        <tbody>
          {runners.map((runner) => (
            <tr key={runner.runnerId}>
              <td
                className="truncate border border-gray-200 px-2 py-3 font-semibold text-gray-800 sm:px-4 sm:py-4"
                title={runner.runnerName}
              >
                {runner.runnerName}
              </td>
              <td className="border border-gray-200 bg-blue-50 px-1 py-3 text-center font-bold sm:px-4 sm:py-4">
                {runner.lagai || "-"}
              </td>
              <td className="border border-gray-200 bg-pink-50 px-1 py-3 text-center font-bold sm:px-4 sm:py-4">
                {runner.khai || "-"}
              </td>
              <td className="border border-gray-200 px-1 py-3 text-center sm:px-4 sm:py-4">
                <ProfitLoss value={positions[runner.runnerId]} />
              </td>
            </tr>
          ))}
          {!runners.length && (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                Match odds abhi available nahi hain.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
