import { Clock, Search, Swords, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../shared/api/apiClient";
import Spinner from "../../shared/components/Spinner";

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
      .get("/matches/saved")
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
      <header className="rounded-2xl bg-(--color-primary) p-6 text-white shadow-sm">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl border border-white/15 bg-white/10">
            <Swords size={21} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold">Matches</h1>
            <p className="mt-1 text-sm text-(--color-text-muted)">
              View all available cricket matches.
            </p>
          </div>
        </div>
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
          <div className="grid min-h-72 place-items-center text-(--color-primary)">
            <Spinner size={28} label="Matches loading" />
          </div>
        ) : (
          <div className="overflow-x-auto p-4">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-gray-500">
                <tr>
                  {[
                    "#",
                    "Match ID",
                    "Title",
                    "Sport",
                    "Date",
                    "Type",
                    "Status",
                  ].map((heading) => (
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
                      colSpan="7"
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
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                          Available
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
