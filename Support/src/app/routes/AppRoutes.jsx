import { Navigate, Route, Routes } from "react-router-dom";
import useAuth from "../../features/auth/hooks/useAuth";
import SupportLayout from "../layouts/SupportLayout";
import LoginPage from "../../features/auth/pages/LoginPage";
import SupportMatchesPage from "../../features/matches/SupportMatchesPage";
import SupportLivePage from "../../features/matches/live/SupportLivePage";
import ManualPage from "../../features/matches/live/Manual/ManualPage";
import ScorePage from "../../features/matches/live/ScorePage/ScorePage";
import Options from "../../features/matches/live/Manual/Options";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid min-h-screen place-items-center text-slate-500">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid min-h-screen place-items-center text-slate-500">Loading...</div>;
  if (user) return <Navigate to="/support/matches" replace />;
  return children;
};

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Public */}
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />

      {/* Protected — all share the same navbar via SupportLayout */}
      <Route element={<ProtectedRoute><SupportLayout /></ProtectedRoute>}>
        <Route path="/support/matches" element={<SupportMatchesPage />} />
        <Route path="/support/matches/:matchId/play" element={<SupportLivePage />} />
        <Route path="/support/matches/:matchId/manual" element={<ManualPage />} />
        <Route path="/support/matches/:matchId/manual/options" element={<Options />} />
        <Route path="/support/matches/:matchId/score" element={<ScorePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
