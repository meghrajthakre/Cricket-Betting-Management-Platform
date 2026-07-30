import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../constants/api";

const reportButtons = [
  { label: "Bet Slips" },
  { label: "Bet Slips2" },
  { label: "Session Bet Slip" },
  { label: "Live Report", path: "live-report" },
  { label: "Company Report" },
  { label: "Client Report" },
  { label: "Collection Report" },
  { label: "Session Earning Report" },
];

const getTitle = (match) =>
  match?.title ||
  [match?.homeTeam, match?.awayTeam].filter(Boolean).join(" vs ") ||
  "Match";

export default function MatchDashboard() {
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const fetchMatch = async () => {
      try {
        const response = await api.get(
          `/matches/saved/${encodeURIComponent(id)}`
        );
        if (active) setMatch(response.data?.data || null);
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ||
              err.message ||
              "Match details load nahi ho paayi."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchMatch();
    return () => {
      active = false;
    };
  }, [id]);

  const title = getTitle(match);
  const marketRows = match
    ? [
        {
          id: String(match._id || "").slice(-7) || "—",
          marketId: match.matchId || "—",
          marketType: "Match Odds",
          runners: [match.homeTeam, match.awayTeam].filter(Boolean).join(", "),
        },
      ]
    : [];

  return (
    <section className="min-h-full text-[#555]">
      <header className="mb-7">
        <h1 className="text-[30px] font-normal leading-tight">Matches</h1>
        <nav className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <span className="text-[#8a6755]">Dashboard</span>
          <span className="text-gray-300">/</span>
          <Link
            to="/superadmin/matches"
            className="text-[#8a6755] hover:text-[#4aabb3] hover:underline"
          >
            Matches
          </Link>
          <span className="text-gray-300">/</span>
          <span className="max-w-[75vw] truncate font-bold" title={title}>
            {loading ? "Loading..." : title}
          </span>
        </nav>
      </header>

      {error ? (
        <div className="border-t-[3px] border-red-300 bg-white p-8 text-center text-red-600">
          {error}
        </div>
      ) : (
        <>
          <div className="border-t-[3px] border-[#e2e5e7] bg-white">
            <h2 className="border-b border-[#e1e1e1] px-5 py-5 text-3xl font-normal">
              Superadmin Match Dashboard
            </h2>
            <div className="flex flex-wrap justify-center gap-1 px-5 py-5">
              {reportButtons.map((button) =>
                button.path ? (
                  <Link
                    key={button.label}
                    to={`/superadmin/matches/${encodeURIComponent(id)}/${button.path}`}
                    className="rounded-sm bg-[#4aabb3] px-5 py-3 text-base font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#388f96] hover:shadow-md"
                  >
                    {button.label}
                  </Link>
                ) : (
                  <button
                    key={button.label}
                    type="button"
                    className="rounded-sm bg-[#4aabb3] px-5 py-3 text-base font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#388f96] hover:shadow-md"
                  >
                    {button.label}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="mt-24 border-t-[3px] border-[#e2e5e7] bg-white">
            <h3 className="border-b border-[#e1e1e1] px-5 py-4 font-bold">
              Match Markets
            </h3>
            <div className="overflow-x-auto p-5">
              <table className="w-full min-w-[650px] border-collapse text-left text-sm">
                <thead>
                  <tr>
                    <th className="border-b border-[#d8d8d8] px-3 py-3">ID</th>
                    <th className="border-b border-[#d8d8d8] px-3 py-3">
                      Betfair Market Id
                    </th>
                    <th className="border-b border-[#d8d8d8] px-3 py-3">
                      Betfair Market Type
                    </th>
                    <th className="border-b border-[#d8d8d8] px-3 py-3">
                      RUNNER
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center">
                        Match markets loading...
                      </td>
                    </tr>
                  ) : (
                    marketRows.map((market) => (
                      <tr key={market.marketId} className="hover:bg-[#f6fbfb]">
                        <td className="border-b border-[#e5e5e5] px-3 py-3">
                          {market.id}
                        </td>
                        <td className="border-b border-[#e5e5e5] px-3 py-3">
                          {market.marketId}
                        </td>
                        <td className="border-b border-[#e5e5e5] px-3 py-3">
                          {market.marketType}
                        </td>
                        <td className="border-b border-[#e5e5e5] px-3 py-3">
                          {market.runners || "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
