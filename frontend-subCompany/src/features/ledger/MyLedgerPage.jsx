import { CalendarDays, Search, Wrench } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import api from "../../shared/api/apiClient";

const cash = (value) => Number(value || 0).toLocaleString("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatDate = (value) => value
  ? new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value))
  : "—";

const shortId = (value) => String(value || "").split(":")[0].slice(-8).toUpperCase() || "—";

export default function MyLedgerPage() {
  const [data, setData] = useState({ rows: [], payable: 0, receivable: 0, netBalance: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dates, setDates] = useState({ from: "", to: "" });
  const [filter, setFilter] = useState({ from: "", to: "" });

  useEffect(() => {
    const controller = new AbortController();
    api.get("/bet/settlement-ledger", { signal: controller.signal, skipAuthRedirect: true })
      .then((response) => setData(response.data?.data || { rows: [], payable: 0, receivable: 0, netBalance: 0 }))
      .catch((requestError) => {
        if (requestError.code !== "ERR_CANCELED") setError(requestError.response?.data?.error || requestError.message);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const rows = useMemo(() => data.rows.filter((row) => {
    const time = new Date(row.date).getTime();
    if (filter.from && time < new Date(`${filter.from}T00:00:00`).getTime()) return false;
    if (filter.to && time > new Date(`${filter.to}T23:59:59.999`).getTime()) return false;
    return true;
  }), [data.rows, filter]);

  return (
    <section className="animate-fade-up -m-3 min-h-full bg-[#f5f5f5] text-[#58636d] sm:-m-6 lg:-m-8">
      <div className="border-b border-[#ddd] bg-white px-5 py-7 sm:px-8">
        <h1 className="text-[28px] font-normal uppercase tracking-wide text-[#4d5964]">My Ledgers</h1>
        <div className="mt-3 flex items-center gap-3 text-sm">
          <span className="text-[#a56c4b]">Dashboard</span><span className="text-gray-300">/</span><b>My Ledgers</b>
        </div>
      </div>

      <div className="border-b border-[#ddd] bg-[#f2f2f2] px-4 py-4 sm:px-8">
        <form onSubmit={(event) => { event.preventDefault(); setFilter(dates); }} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex w-full max-w-[325px] items-center border border-[#d5d5d5] bg-white">
            <CalendarDays size={17} className="ml-3 text-[#4facb5]" />
            <input type="date" value={dates.from} onChange={(event) => setDates((current) => ({ ...current, from: event.target.value }))} className="h-10 min-w-0 flex-1 px-2 text-sm outline-none" />
            <span className="text-gray-400">-</span>
            <input type="date" value={dates.to} onChange={(event) => setDates((current) => ({ ...current, to: event.target.value }))} className="h-10 min-w-0 flex-1 px-2 text-sm outline-none" />
          </div>
          <button className="inline-flex h-10 items-center justify-center gap-2 bg-[#4fabb5] px-8 text-sm font-semibold text-white hover:bg-[#4197a0]"><Search size={16} />Search</button>
        </form>
      </div>

      <div className="p-4 sm:p-8">
        <div className="border-t-[3px] border-[#e1e4e5] bg-white">
          <div className="flex items-center justify-between border-b border-[#e4e4e4] px-5 py-4">
            <h2 className="text-[17px] font-semibold">Agent Ledger</h2>
            <Wrench size={17} className="text-gray-400" />
          </div>
          <div className="overflow-x-auto px-4 pb-5 pt-4 sm:px-6">
            <table className="w-full min-w-[950px] border-collapse text-[13px]">
              <thead><tr className="border-b border-[#ddd] text-left text-[#56616b]">
                {['LID', 'DATE/TIME', 'ENTRY', 'DEBIT', 'CREDIT', 'BALANCE', 'NOTE'].map((heading) => <th key={heading} className="px-3 py-3 font-bold">{heading}</th>)}
              </tr></thead>
              <tbody>
                {(loading || error || !rows.length) && <tr><td colSpan={7} className={`border-b px-3 py-14 text-center ${error ? "text-red-600" : "text-gray-400"}`}>{loading ? "Ledger loading..." : error || "No declared-match ledger entries found."}</td></tr>}
                {!loading && !error && rows.map((row) => <tr key={row.id} className="border-b border-[#e1e4e6] hover:bg-[#fafafa]">
                  <td className="px-3 py-3 text-[#55728a]">{shortId(row.id)}</td>
                  <td className="whitespace-nowrap px-3 py-3">{formatDate(row.date)}</td>
                  <td className="px-3 py-3 font-medium">{row.matchName}</td>
                  <td className="px-3 py-3 font-semibold text-red-600">{row.type === "debit" ? cash(row.amount) : "-"}</td>
                  <td className="px-3 py-3 font-semibold text-emerald-600">{row.type === "credit" ? cash(row.amount) : "-"}</td>
                  <td className={`px-3 py-3 font-semibold ${row.balance > 0 ? "text-red-600" : row.balance < 0 ? "text-emerald-600" : "text-gray-500"}`}>{row.balance < 0 ? "-" : ""}{cash(Math.abs(row.balance))}</td>
                  <td className="px-3 py-3">{row.note}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
