import { useEffect, useMemo, useState } from "react";
import { Clock, Search } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../../shared/api/apiClient";
import Spinner from "../../shared/components/Spinner";

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
};

const formatSportType = (sportKey) => {
  if (!sportKey) return "Cricket";

  return sportKey
    .replace(/^cricket_/, "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const getTitle = (match) => {
  if (match.title) return match.title;
  if (match.homeTeam && match.awayTeam) {
    return `${match.homeTeam} vs ${match.awayTeam}`;
  }
  return match.homeTeam || match.awayTeam || "Untitled match";
};

export default function MatchesPage() {
  const [matches, setMatches] = useState([]);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const fetchSavedMatches = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await api.get("/matches/saved");
        const savedMatches = response.data?.data;

        if (active) {
          setMatches(Array.isArray(savedMatches) ? savedMatches : []);
        }
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ||
              err.message ||
              "Saved matches load nahi ho paaye."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchSavedMatches();
    return () => {
      active = false;
    };
  }, []);

  const filteredMatches = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return matches;

    return matches.filter((match) =>
      [
        match._id,
        match.matchId,
        match.homeTeam,
        match.awayTeam,
        match.sportKey,
        getTitle(match),
      ].some((value) => String(value || "").toLowerCase().includes(term))
    );
  }, [matches, search]);

  const handleSearch = (event) => {
    event.preventDefault();
    setSearch(query);
  };

  const handleClear = () => {
    setQuery("");
    setSearch("");
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-4">
        <Spinner size={48} variant="ocean" label="Matches loading" />
        <div className="text-center">
          <p className="text-sm font-semibold text-(--color-text-dark)">
            Matches loading...
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Saved matches fetch ho rahe hain
          </p>
        </div>
      </div>
    );
  }

  return (
    <section className="min-h-full text-[#555]">
      <header className="mb-7">
        <h1 className="text-[30px] font-normal leading-tight text-[#555]">
          Matches
        </h1>
        <div className="mt-3 flex items-center gap-3 text-sm">
          <span className="text-[#8a6755]">Dashboard</span>
          <span className="text-gray-300">/</span>
          <span className="font-bold text-[#555]">Matches</span>
        </div>
      </header>

      <div className="border-t-[3px] border-[#e2e5e7] bg-white">
        <div className="flex flex-col gap-3 border-b border-[#e1e1e1] px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-bold text-[#555]">Cricket Matches</h2>

          <form
            onSubmit={handleSearch}
            className="flex w-full items-stretch gap-1 sm:w-auto"
          >
            <div className="relative min-w-0 flex-1 sm:w-52">
              <Search
                aria-hidden="true"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 sm:hidden"
                size={14}
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search"
                aria-label="Search matches"
                className="h-9 w-full border border-[#999] bg-white px-2 text-sm outline-none placeholder:text-gray-500 focus:border-[#45a9b1] focus:ring-1 focus:ring-[#45a9b1] sm:pl-2"
              />
            </div>
            <button
              type="submit"
              className="h-9 rounded-sm bg-[#4aabb3] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#3c969d]"
            >
              Search
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="h-9 rounded-sm bg-[#e6555b] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#cf454b]"
            >
              Clear
            </button>
          </form>
        </div>

        <div className="overflow-x-auto px-5 py-5">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead>
              <tr className="bg-[#f3f3f3] text-left">
                {[
                  "ID",
                  "PID",
                  "Title",
                  "Sport",
                  "Date",
                  "Type",
                  "Declared",
                  "Won By",
                  "Profit / Loss",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="border border-[#dedede] px-3 py-3 font-bold text-[#555]"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {error && (
                <tr>
                  <td
                    colSpan={9}
                    className="border border-[#dedede] px-4 py-12 text-center text-red-600"
                  >
                    {error}
                  </td>
                </tr>
              )}

              {!error && filteredMatches.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="border border-[#dedede] px-4 py-12 text-center text-gray-500"
                  >
                    {search
                      ? "Search se koi saved match nahi mila."
                      : "Koi saved match available nahi hai."}
                  </td>
                </tr>
              )}

              {!error &&
                filteredMatches.map((match, index) => (
                  <tr
                    key={match._id || match.matchId}
                    className="odd:bg-white even:bg-[#fafafa] hover:bg-[#f6fbfb]"
                  >
                    <td className="border border-[#dedede] px-3 py-3">
                      <span
                        className="block max-w-16 truncate sm:max-w-24"
                        title={match._id || String(index + 1)}
                      >
                        {match._id || index + 1}
                      </span>
                    </td>
                    <td className="border border-[#dedede] px-3 py-3">
                      <span
                        className="block max-w-20 truncate sm:max-w-32"
                        title={match.matchId || ""}
                      >
                        {match.matchId || "—"}
                      </span>
                    </td>
                    <td className="border border-[#dedede] px-3 py-3">
                      <Link
                        to={`/superadmin/matches/${encodeURIComponent(match.matchId)}`}
                        className="inline-block font-bold text-[#3271b8] underline-offset-4 transition-all duration-200 hover:-translate-y-px hover:text-[#21558f] hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3271b8]"
                        title={`Open ${getTitle(match)}`}
                      >
                        {getTitle(match)}
                      </Link>
                    </td>
                    <td className="border border-[#dedede] px-3 py-3 uppercase">
                      Cricket
                    </td>
                    <td className="whitespace-nowrap border border-[#dedede] px-3 py-3">
                      <span className="inline-flex items-center gap-2">
                        <Clock size={14} className="text-[#666]" />
                        {formatDate(match.commenceTime)}
                      </span>
                    </td>
                    <td className="border border-[#dedede] px-3 py-3">
                      {formatSportType(match.sportKey)}
                    </td>
                    <td className="border border-[#dedede] px-3 py-3">
                      <span className={`font-semibold ${match.isDeclared ? "text-emerald-600" : "text-gray-500"}`}>
                        {match.isDeclared ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="border border-[#dedede] px-3 py-3 font-semibold">
                      {match.wonBy || "—"}
                    </td>
                    <td className="border border-[#dedede] px-3 py-3 font-bold">
                      <span className={!match.isDeclared ? "text-gray-400" : Number(match.profitLoss) > 0 ? "text-emerald-600" : Number(match.profitLoss) < 0 ? "text-red-600" : "text-gray-500"}>
                        {!match.isDeclared ? "—" : <>{Number(match.profitLoss || 0) > 0 ? "+" : ""}{Number(match.profitLoss || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
