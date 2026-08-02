import { Outlet } from "react-router-dom";
import SupportNavbar from "../../shared/components/common/SupportNavbar";

export default function SupportLayout() {
  return (
    <div className="min-h-screen bg-(--color-bg-main)">
      <SupportNavbar />
      <Outlet />
    </div>
  );
}
