import { Clock, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../shared/api/apiClient";

const TABLE_HEADINGS = ["#", "Match ID", "Title", "Sport", "Date", "Type", "Status", "P/L Status", "Profit / Loss"];

function MatchesTableSkeleton() {
  return (
    <div className="overflow-x-auto p-4" aria-label="Loading matches" aria-busy="true">
      <table className="w-full min-w-[900px] border-collapse text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-gray-500"><tr>{TABLE_HEADINGS.map((heading) => <th key={heading} className="border border-gray-200 px-3 py-3 text-left font-bold">{heading}</th>)}</tr></thead>
        <tbody>{Array.from({ length: 6 }, (_, row) => <tr key={row}>{TABLE_HEADINGS.map((heading, column) => <td key={heading} className="border border-gray-200 px-3 py-3"><span className={`block h-5 animate-pulse rounded bg-slate-200 ${column === 2 ? "w-52" : column === 4 ? "w-36" : column === 0 ? "w-7" : "w-24"}`} /></td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const formatSport = (value) =>
  value
    ? value
        .replace(/^cricket_/, "")
        .replaceAll("_", " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
    : "Cricket";

const getTitle = (match) =>
  match.title ||
  (match.homeTeam && match.awayTeam
    ? `${match.homeTeam} vs ${match.awayTeam}`
    : match.homeTeam || match.awayTeam || "Untitled match");

export default function MatchesPage() {
  const [matches, setMatches] = useState([]);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api
      .get("/bet/company-match-summaries")
      .then((response) => {
        if (active)
          setMatches(
            Array.isArray(response.data?.data) ? response.data.data : [],
          );
      })
      .catch((requestError) => {
        if (active)
          setError(
            requestError.response?.data?.message ||
              requestError.message ||
              "Matches load nahi ho paaye.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return matches;
    return matches.filter((match) =>
      [
        match.matchId,
        match.homeTeam,
        match.awayTeam,
        match.sportKey,
        getTitle(match),
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(term),
      ),
    );
  }, [matches, search]);

  return (
    <section className="animate-fade-up space-y-5">
      <header>
        <h1 className="text-xl font-bold text-(--color-primary) sm:text-2xl">Matches</h1>
        <p className="mt-1 text-sm text-slate-500">View all available cricket matches.</p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-(--color-border) bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-(--color-border) p-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-bold text-(--color-primary)">Cricket Matches</h2>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setSearch(query);
            }}
            className="flex w-full gap-2 sm:max-w-md"
          >
            <div className="relative min-w-0 flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search matches..."
                className="w-full rounded-xl border border-(--color-border) bg-slate-50 py-2.5 pl-9 pr-9 text-sm outline-none transition focus:border-(--color-banner) focus:bg-white"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setSearch("");
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-gray-400 hover:bg-gray-100"
                >
                  <X size={15} />
                </button>
              )}
            </div>
            <button className="rounded-xl bg-(--color-btn-bg) px-4 py-2 text-sm font-bold text-white transition hover:bg-(--color-btn-hover)">
              Search
            </button>
          </form>
        </div>

        {loading ? (
          <MatchesTableSkeleton />
        ) : (
          <div className="overflow-x-auto p-4">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-gray-500">
                <tr>
                  {TABLE_HEADINGS.map((heading) => (
                    <th
                      key={heading}
                      className="border border-gray-200 px-3 py-3 text-left font-bold"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(error || filtered.length === 0) && (
                  <tr>
                    <td
                      colSpan="9"
                      className={`border border-gray-200 px-4 py-14 text-center ${error ? "text-red-600" : "text-gray-400"}`}
                    >
                      {error ||
                        (search
                          ? "No matching cricket match found."
                          : "No saved match available.")}
                    </td>
                  </tr>
                )}
                {!error &&
                  filtered.map((match, index) => (
                    <tr
                      key={match._id || match.matchId}
                      className="transition hover:bg-blue-50/40"
                    >
                      <td className="border border-gray-200 px-3 py-3 text-gray-400">
                        {index + 1}
                      </td>
                      <td className="border border-gray-200 px-3 py-3 font-semibold">
                        {match.matchId || "-"}
                      </td>
                      <td className="border border-gray-200 px-3 py-3 font-bold text-(--color-primary)">
                        <Link
                          to={`/sub-company/matches/${encodeURIComponent(match.matchId)}`}
                          className="underline-offset-4 hover:text-(--color-banner) hover:underline"
                        >
                          {getTitle(match)}
                        </Link>
                      </td>
                      <td className="border border-gray-200 px-3 py-3">
                        Cricket
                      </td>
                      <td className="whitespace-nowrap border border-gray-200 px-3 py-3">
                        <span className="inline-flex items-center gap-2">
                          <Clock size={14} />
                          {formatDate(match.commenceTime)}
                        </span>
                      </td>
                      <td className="border border-gray-200 px-3 py-3">
                        {formatSport(match.sportKey)}
                      </td>
                      <td className="border border-gray-200 px-3 py-3">
                        <span className={`font-bold ${match.isDeclared ? "text-emerald-600" : "text-gray-500"}`}>
                          {match.isDeclared ? `Settled · ${match.wonBy || "Winner"}` : "Pending"}
                        </span>
                      </td>
                      <td className="border border-gray-200 px-3 py-3 font-bold">
                        <span className={!match.isDeclared ? "text-gray-400" : Number(match.profitLoss) > 0 ? "text-emerald-600" : Number(match.profitLoss) < 0 ? "text-red-600" : "text-gray-500"}>
                          {!match.isDeclared ? "—" : Number(match.profitLoss) > 0 ? "Profit" : Number(match.profitLoss) < 0 ? "Loss" : "No P/L"}
                        </span>
                      </td>
                      <td className="border border-gray-200 px-3 py-3 font-bold">
                        <span className={!match.isDeclared ? "text-gray-400" : Number(match.profitLoss) > 0 ? "text-emerald-600" : Number(match.profitLoss) < 0 ? "text-red-600" : "text-gray-500"}>
                          {!match.isDeclared ? "—" : <>{Number(match.profitLoss || 0) > 0 ? "+" : ""}{Number(match.profitLoss || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
