import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import Spinner from "../../shared/components/Spinner";
import { getMe } from "../../shared/api/userApi";

export default function ProtectedRoute() {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    const controller = new AbortController();

    getMe(controller.signal)
      .then((response) => {
        const user = response?.data?.user;
        setStatus(user?.role === "superadmin" ? "allowed" : "denied");
      })
      .catch((error) => {
        if (error.code !== "ERR_CANCELED") setStatus("denied");
      });

    return () => controller.abort();
  }, []);

  if (status === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-(--color-bg-main)">
        <Spinner size={38} variant="ocean" label="Checking session" />
      </div>
    );
  }

  return status === "allowed" ? <Outlet /> : <Navigate to="/login" replace />;
}
