import { formatNumber } from "../utils/reportCalculations";

export default function BetsTable({ bets }) {
  return (
    <section className="overflow-hidden rounded-lg border border-(--color-border) bg-white shadow-sm">
      <div className="border-b border-gray-200 px-5 py-4">
        <h2 className="font-bold text-gray-900">Live Bets ({bets.length})</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Team / Session</th>
              <th className="px-4 py-3">Market</th>
              <th className="px-4 py-3">Bet</th>
              <th className="px-4 py-3 text-right">Rate</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 text-right">Win</th>
              <th className="px-4 py-3 text-right">Loss</th>
              <th className="px-4 py-3">Time</th>
            </tr>
          </thead>
          <tbody>
            {bets.map((bet) => (
              <tr
                key={bet._id}
                className="border-t border-gray-100 hover:bg-gray-50"
              >
                <td className="px-4 py-3 font-semibold text-gray-900">
                  {bet.userId?.username || bet.userId?.firstName || "User"}
                </td>
                <td className="px-4 py-3 font-semibold text-[#356f8d]">
                  {bet.selectionName || bet.marketId || "-"}
                </td>
                <td className="px-4 py-3 capitalize text-gray-600">
                  {bet.marketType}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`font-bold ${
                      bet.type === "yes" ? "text-blue-700" : "text-pink-700"
                    }`}
                  >
                    {bet.type === "yes" ? "LAGAI" : "KHAI"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">{bet.rate}</td>
                <td className="px-4 py-3 text-right font-semibold">
                  {formatNumber(bet.amount)}
                </td>
                <td className="px-4 py-3 text-right text-green-600">
                  {formatNumber(bet.profit)}
                </td>
                <td className="px-4 py-3 text-right text-red-600">
                  {formatNumber(bet.loss)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">
                  {new Date(bet.createdAt).toLocaleString("en-IN")}
                </td>
              </tr>
            ))}
            {!bets.length && (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-10 text-center text-gray-400"
                >
                  Is match par abhi koi bet nahi lagi hai.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
