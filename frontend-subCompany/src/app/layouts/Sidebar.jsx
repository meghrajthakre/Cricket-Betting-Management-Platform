import {
  FileBarChart2,
  LayoutDashboard,
  LogOut,
  NotebookTabs,
  Swords,
  UserPlus,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { logout } from "../../shared/api/authApi";

const links = [
  { label: "Dashboard", to: "/sub-company/dashboard", icon: LayoutDashboard },
  { label: "Matches", to: "/sub-company/matches", icon: Swords },
  { label: "Create User", to: "/sub-company/create-user", icon: UserPlus },
  {
    label: "Collection Report",
    to: "/sub-company/collection-report",
    icon: FileBarChart2,
  },
  { label: "My Ledger", to: "/sub-company/my-ledger", icon: NotebookTabs },
];
export default function Sidebar({ open, onClose }) {
  const navigate = useNavigate();
  const signOut = async () => {
    onClose();
    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  };
  const itemClass = (active) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition duration-200 ${active ? "bg-gradient-to-r from-white/20 to-white/5 text-white shadow-lg" : "text-white/70 hover:translate-x-0.5 hover:bg-white/10 hover:text-white"}`;
  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-20 bg-black/40 backdrop-blur-sm lg:hidden ${open ? "block" : "hidden"}`}
      />
      <aside
        className={`fixed left-0 top-[55px] z-30 flex h-[calc(100vh-55px)] w-[260px] flex-col bg-[#2E4151] p-3 transition-transform duration-300 lg:static lg:h-auto lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <nav className="flex-1 space-y-1 pt-4">
          {links.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) => itemClass(isActive)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <button
          type="button"
          onClick={signOut}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/70 transition hover:bg-red-500/20 hover:text-white"
        >
          <LogOut size={18} />
          Logout
        </button>
        <p className="py-3 text-center text-[10px] text-white/25">
          SUB COMPANY PANEL
        </p>
      </aside>
    </>
  );
}
