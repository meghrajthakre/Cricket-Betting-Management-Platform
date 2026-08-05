import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "../layouts/Layout";
import LoginPage from "../../features/auth/LoginPage";
import DashboardPage from "../../features/dashboard/DashboardPage";
import CollectionReportPage from "../../features/collection-report/CollectionReportPage";
import MyLedgerPage from "../../features/ledger/MyLedgerPage";
import MatchesPage from "../../features/matches/MatchesPage";
import ProtectedRoute from "./ProtectedRoute";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/sub-company" element={<Layout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="matches" element={<MatchesPage />} />
          <Route path="collection-report" element={<CollectionReportPage />} />
          <Route path="my-ledger" element={<MyLedgerPage />} />
        </Route>
      </Route>
      <Route
        path="*"
        element={<Navigate to="/sub-company/dashboard" replace />}
      />
    </Routes>
  );
}
