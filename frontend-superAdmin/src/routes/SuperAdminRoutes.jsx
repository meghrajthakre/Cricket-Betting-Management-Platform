import { Route, Navigate } from "react-router-dom";
import Layout from "../layout/Layout";

import Dashboard from "../pages/Dashboard";
import AdminsPage from "../pages/admins/AdminsPage";
import CollectionReport from "../pages/CollectionReport";
import SuperadminProfilePage from "../pages/profile/SuperadminProfilePage";
import SettingsPage from "../pages/settings/SettingsPage";
import CreateUserPage from "../pages/createUser/CreateUserPage";

import MatchRoutes from "./MatchRoutes";
import ProtectedRoute from "./ProtectedRoute";

export default function SuperAdminRoutes() {
  return (
    <Route element={<ProtectedRoute />}>
      <Route path="/superadmin" element={<Layout />}>
        <Route index element={<Navigate to="dashboard" replace />} />

        <Route path="dashboard" element={<Dashboard />} />
        <Route path="admins" element={<AdminsPage />} />
        <Route path="create-user" element={<CreateUserPage />} />
        <Route path="collection-report" element={<CollectionReport />} />
        <Route path="profile" element={<SuperadminProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />

        {MatchRoutes()}
      </Route>
    </Route>
  );
}
