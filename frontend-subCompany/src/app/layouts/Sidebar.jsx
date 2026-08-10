import {
  ChevronDown,
  FileBarChart2,
  LayoutDashboard,
  LogOut,
  NotebookTabs,
  Swords,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { Fragment, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { logout } from "../../shared/api/authApi";

const links = [
  { label: "Dashboard", to: "/sub-company/dashboard", icon: LayoutDashboard },
  { label: "Matches", to: "/sub-company/matches", icon: Swords },
  {
    label: "Collection Report",
    to: "/sub-company/collection-report",
    icon: FileBarChart2,
  },
  { label: "My Ledger", to: "/sub-company/my-ledger", icon: NotebookTabs },
];

function ManageClientsMenu({ itemClass, onClose }) {
  const { pathname } = useLocation();
  const isActive = ["/sub-company/my-clients", "/sub-company/blocked-clients", "/sub-company/commission-limits"].includes(pathname);
  const [open, setOpen] = useState(isActive);
  return (
    <div>
      <button type="button" onClick={() => setOpen((value) => !value)} className={`${itemClass(isActive)} w-full`} aria-expanded={open}>
        <Users size={18} /><span className="flex-1 text-left">Manage Clients</span><ChevronDown size={15} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="mt-1 space-y-1 border-l border-white/15 pl-3 ml-5">
        <NavLink to="/sub-company/my-clients" onClick={onClose} className={({ isActive: active }) => itemClass(active)}><Users size={17} /><span>My Clients</span></NavLink>
        <NavLink to="/sub-company/blocked-clients" onClick={onClose} className={({ isActive: active }) => itemClass(active)}><Users size={17} /><span>Blocked Clients</span></NavLink>
        <NavLink to="/sub-company/commission-limits" onClick={onClose} className={({ isActive: active }) => itemClass(active)}><SlidersHorizontal size={17} /><span>Commission & Limits</span></NavLink>
      </div>}
    </div>
  );
}
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
            <Fragment key={to}>
              <NavLink
                to={to}
                onClick={onClose}
                className={({ isActive }) => itemClass(isActive)}
              >
                <Icon size={18} />
                <span>{label}</span>
              </NavLink>
              {label === "Matches" && <ManageClientsMenu itemClass={itemClass} onClose={onClose} />}
            </Fragment>
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
