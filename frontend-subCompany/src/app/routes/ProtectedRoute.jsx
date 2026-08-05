import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { getMe } from "../../shared/api/authApi";
import Spinner from "../../shared/components/Spinner";

export default function ProtectedRoute() {
  const [allowed, setAllowed] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    getMe(controller.signal)
      .then((response) =>
        setAllowed(response?.data?.user?.role === "sub_company"),
      )
      .catch((error) => {
        if (error.code !== "ERR_CANCELED") setAllowed(false);
      });
    return () => controller.abort();
  }, []);
  if (allowed === null)
    return (
      <div className="grid min-h-screen place-items-center bg-(--color-bg-main) text-(--color-primary)">
        <Spinner size={38} label="Checking session" />
      </div>
    );
  return allowed ? <Outlet /> : <Navigate to="/login" replace />;
}
