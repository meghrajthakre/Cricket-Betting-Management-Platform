import { Route } from "react-router-dom";
import MatchesPage from "../pages/matches/MatchesPage";
import InPlayMatchesPage from "../pages/addMatches/InPlayMatchesPage";
import MatchLiveReport from "../pages/matches/MatchLiveReport";
import MatchDashboard from "../pages/matches/MatchDashboard";

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
