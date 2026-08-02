import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../shared/api/apiClient";
import Spinner from "../../shared/components/Spinner";
import BetSlipsPanel from "./match-dashboard/components/BetSlipsPanel";
import SessionBetSlipsPanel from "./match-dashboard/components/SessionBetSlipsPanel";
import { deleteBetSlip, fetchMatchBets } from "./live-report/api/liveReportApi";

const reportButtons = [
  { label: "Bet Slips", panel: "match" },
  { label: "Session Bet Slips", panel: "session" },
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
  const [activePanel, setActivePanel] = useState(null);
  const [bets, setBets] = useState([]);
  const [betsLoading, setBetsLoading] = useState(false);
  const [betsError, setBetsError] = useState("");
  const [deletingBetId, setDeletingBetId] = useState("");

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

  const openBetPanel = async (panel) => {
    setActivePanel(panel);
    setBetsLoading(true);
    setBetsError("");
    try {
      setBets(await fetchMatchBets(id));
    } catch (requestError) {
      setBetsError(
        requestError.response?.data?.error ||
          requestError.message ||
          "Bet slips load nahi ho paaye."
      );
    } finally {
      setBetsLoading(false);
    }
  };

  const handleDeleteBet = async (bet) => {
    const confirmed = window.confirm("Kya aap is bet slip ko delete karna chahte hain? Pending slip ki reserved amount user wallet me adjust ho jayegi.");
    if (!confirmed) return;
    setDeletingBetId(bet._id);
    setBetsError("");
    try {
      await deleteBetSlip(bet._id);
      setBets((current) => current.filter((item) => item._id !== bet._id));
    } catch (requestError) {
      setBetsError(
        requestError.response?.data?.error ||
          requestError.message ||
          "Bet slip delete nahi ho paayi."
      );
    } finally {
      setDeletingBetId("");
    }
  };
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

  if (loading) {
    return (
      <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-4">
        <Spinner size={48} variant="ocean" label="Match dashboard loading" />
        <div className="text-center">
          <p className="text-sm font-semibold text-(--color-text-dark)">
            Match dashboard loading...
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Match markets fetch ho rahe hain
          </p>
        </div>
      </div>
    );
  }

  return (
    <section className="min-h-full text-(--color-text-dark)">
      <header className="mb-7">
        <h1 className="text-[30px] font-normal leading-tight text-(--color-text-dark)">Matches</h1>
        <nav className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <span className="text-(--color-banner)">Dashboard</span>
          <span className="text-gray-300">/</span>
          <Link
            to="/superadmin/matches"
            className="text-(--color-banner) hover:text-(--color-primary) hover:underline"
          >
            Matches
          </Link>
          <span className="text-gray-300">/</span>
          <span className="max-w-[75vw] truncate font-bold text-(--color-text-dark)" title={title}>
            {title}
          </span>
        </nav>
      </header>

      {error ? (
        <div className="border-t-[3px] border-red-300 bg-white p-8 text-center text-red-600">
          {error}
        </div>
      ) : (
        <>
          <div className="border-t-[3px] border-(--color-border) bg-white">
            <h2 className="border-b border-(--color-border) px-5 py-5 text-3xl font-normal text-(--color-primary)">
              Superadmin Match Dashboard
            </h2>
            <div className="flex flex-wrap justify-center gap-1 px-5 py-5">
              {reportButtons.map((button) =>
                button.path ? (
                  <Link
                    key={button.label}
                    to={`/superadmin/matches/${encodeURIComponent(id)}/${button.path}`}
                    className="rounded-sm bg-(--color-banner) px-5 py-3 text-base font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-(--color-primary-light) hover:shadow-md"
                  >
                    {button.label}
                  </Link>
                ) : button.panel ? (
                  <button
                    key={button.label}
                    type="button"
                    onClick={() => openBetPanel(button.panel)}
                    className="cursor-pointer rounded-sm bg-(--color-banner) px-5 py-3 text-base font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-(--color-primary-light) hover:shadow-md"
                  >
                    {button.label}
                  </button>
                ) : (
                  <button
                    key={button.label}
                    type="button"
                    className="cursor-pointer rounded-sm bg-(--color-banner) px-5 py-3 text-base font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-(--color-primary-light) hover:shadow-md"
                  >
                    {button.label}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="mt-24 border-t-[3px] border-(--color-border) bg-white">
            <h3 className="border-b border-(--color-border) px-5 py-4 font-bold text-(--color-primary)">
              Match Markets
            </h3>
            <div className="overflow-x-auto p-5">
              <table className="w-full min-w-[650px] border-collapse text-left text-sm">
                <thead>
                  <tr>
                    <th className="border-b border-(--color-border) px-3 py-3">ID</th>
                    <th className="border-b border-(--color-border) px-3 py-3">
                      Betfair Market Id
                    </th>
                    <th className="border-b border-(--color-border) px-3 py-3">
                      Betfair Market Type
                    </th>
                    <th className="border-b border-(--color-border) px-3 py-3">
                      RUNNER
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {marketRows.map((market) => (
                      <tr key={market.marketId} className="hover:bg-(--color-bg-main)">
                        <td className="border-b border-(--color-border) px-3 py-3">
                          {market.id}
                        </td>
                        <td className="border-b border-(--color-border) px-3 py-3">
                          {market.marketId}
                        </td>
                        <td className="border-b border-(--color-border) px-3 py-3">
                          {market.marketType}
                        </td>
                        <td className="border-b border-(--color-border) px-3 py-3">
                          {market.runners || "—"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activePanel === "match" && (
        <BetSlipsPanel bets={bets} loading={betsLoading} error={betsError} deletingId={deletingBetId} onClose={() => setActivePanel(null)} onDelete={handleDeleteBet} />
      )}
      {activePanel === "session" && (
        <SessionBetSlipsPanel bets={bets} loading={betsLoading} error={betsError} deletingId={deletingBetId} onClose={() => setActivePanel(null)} onDelete={handleDeleteBet} />
      )}
    </section>
  );
}
