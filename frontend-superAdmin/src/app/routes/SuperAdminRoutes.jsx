import { Route, Navigate } from "react-router-dom";
import Layout from "../layouts/Layout";

import DashboardPage from "../../features/dashboard/pages/DashboardPage";
import AdminsPage from "../../features/admins/AdminsPage";
import CollectionReportPage from "../../features/collection-report/pages/CollectionReportPage";
import SuperAdminProfilePage from "../../features/profile/SuperAdminProfilePage";
import SettingsPage from "../../features/settings/SettingsPage";
import CreateUserPage from "../../features/users/CreateUserPage";
import SubCompaniesPage from "../../features/sub-companies/SubCompaniesPage";
import CompanyLedgerPage from "../../features/ledger/CompanyLedgerPage";

import MatchRoutes from "./MatchRoutes";
import ProtectedRoute from "./ProtectedRoute";

export default function SuperAdminRoutes() {
  return (
    <Route element={<ProtectedRoute />}>
      <Route path="/superadmin" element={<Layout />}>
        <Route index element={<Navigate to="dashboard" replace />} />

        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="admins" element={<AdminsPage />} />
        <Route path="sub-companies" element={<SubCompaniesPage />} />
        <Route path="create-user" element={<CreateUserPage />} />
        <Route path="collection-report" element={<CollectionReportPage />} />
        <Route path="company-ledger" element={<CompanyLedgerPage />} />
        <Route path="profile" element={<SuperAdminProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />

        {MatchRoutes()}
      </Route>
    </Route>
  );
}
