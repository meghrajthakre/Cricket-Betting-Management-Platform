import { Route } from "react-router-dom";
import MatchesPage from "../../features/matches/MatchesPage";
import InPlayMatchesPage from "../../features/matches/InPlayMatchesPage";
import MatchLiveReport from "../../features/matches/MatchLiveReport";
import MatchDashboard from "../../features/matches/MatchDashboard";

export default function MatchRoutes() {
  return (
    <>
      <Route path="matches" element={<MatchesPage />} />
      <Route path="matches/:id" element={<MatchDashboard />} />
      <Route path="matches/:id/live-report" element={<MatchLiveReport />} />
      <Route path="in-play-matches" element={<InPlayMatchesPage />} />
    </>
  );
}
