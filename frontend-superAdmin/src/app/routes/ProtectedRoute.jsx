import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import Spinner from "../../shared/components/Spinner";
import { getMe } from "../../shared/api/userApi";

export default function ProtectedRoute() {
  const [status, setStatus] = useState(() =>
    sessionStorage.getItem("superAdminVerified") === "true" ? "allowed" : "checking"
  );

  useEffect(() => {
    if (status !== "checking") return undefined;
    const controller = new AbortController();

    getMe(controller.signal)
      .then((response) => {
        const user = response?.data?.user;
        const allowed = user?.role === "superadmin";
        if (allowed) sessionStorage.setItem("superAdminVerified", "true");
        setStatus(allowed ? "allowed" : "denied");
      })
      .catch((error) => {
        if (error.code !== "ERR_CANCELED") setStatus("denied");
      });

    return () => controller.abort();
  }, [status]);

  if (status === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-(--color-bg-main)">
        <Spinner size={38} variant="ocean" label="Checking session" />
      </div>
    );
  }

  return status === "allowed" ? <Outlet /> : <Navigate to="/login" replace />;
}
