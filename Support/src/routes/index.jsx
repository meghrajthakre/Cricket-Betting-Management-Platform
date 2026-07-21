import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import SupportLayout from "./SupportLayout";
import LoginPage from "../pages/Login/LoginPage";
import SupportMatches from "../pages/matches/SupportMatches";
import SupportLive from "../pages/matches/SupportLive/supportLive";
import ManualPage from "../pages/matches/SupportLive/Manual/Manualpage";
import ScorePage from "../pages/matches/SupportLive/ScorePage/ScorePage";
import Options from "../pages/matches/SupportLive/Manual/Options";

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
        <Route path="/support/matches" element={<SupportMatches />} />
        <Route path="/support/matches/:matchId/play" element={<SupportLive />} />
        <Route path="/support/matches/:matchId/manual" element={<ManualPage />} />
        <Route path="/support/matches/:matchId/manual/options" element={<Options />} />
        <Route path="/support/matches/:matchId/score" element={<ScorePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
