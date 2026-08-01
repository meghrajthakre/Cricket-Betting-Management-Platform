import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FileBarChart2,
  Swords,
  Radio,
  KeyRound,
  Settings,
  LogOut,
  UserPlus,
  ChevronRight,
} from "lucide-react";
import { logoutUser } from "../services/userService";

const NAV_ITEMS = [
  { label: "Dashboard",         to: "/superadmin/dashboard",         icon: LayoutDashboard },
  { label: "Admins",            to: "/superadmin/admins",            icon: Users },
  { label: "Create User",       to: "/superadmin/create-user",       icon: UserPlus },
  { label: "Collection Report", to: "/superadmin/collection-report", icon: FileBarChart2 },
  { label: "Matches",           to: "/superadmin/matches",           icon: Swords },
  { label: "In Play Matches",   to: "/superadmin/in-play-matches",   icon: Radio },
  { label: "Profile",           to: "/superadmin/profile",           icon: KeyRound },
  { label: "Settings",          to: "/superadmin/settings",          icon: Settings },
];

const SIDEBAR_BG = "#2E4151";

function NavItem({ label, icon: Icon, isActive, onClick }) {
  return (
    <span
      onClick={onClick}
      className={`
        group relative flex items-center gap-3 px-3 py-2.5 rounded-xl
        transition-all duration-200 cursor-pointer select-none text-sm font-semibold
        ${isActive 
          ? "bg-gradient-to-r from-white/20 to-white/5 text-white shadow-lg" 
          : "text-white/70 hover:bg-white/10 hover:text-white hover:translate-x-0.5"
        }
      `}
      style={{ fontFamily: "var(--font-app)" }}
    >
      {/* Active indicator - modern gradient bar */}
      {isActive && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full"
          style={{ 
            width: 3, 
            height: "50%", 
            background: "linear-gradient(135deg, #90B4D4 0%, #C5E0F4 100%)",
            boxShadow: "0 0 8px rgba(144, 180, 212, 0.5)"
          }}
        />
      )}

      {/* Icon with modern effects */}
      <div className="relative">
        <Icon
          size={18}
          strokeWidth={isActive ? 2.2 : 1.8}
          className="shrink-0 transition-all duration-200 group-hover:scale-105"
          style={{ 
            color: isActive ? "#fff" : "rgba(255,255,255,0.55)",
            filter: isActive ? "drop-shadow(0 0 2px rgba(144, 180, 212, 0.5))" : "none"
          }}
        />
      </div>

      {/* Label */}
      <span className="flex-1">{label}</span>

      {/* Arrow indicator on hover (except active) */}
      {!isActive && (
        <ChevronRight 
          size={14} 
          className="opacity-0 group-hover:opacity-100 transition-all duration-200 transform group-hover:translate-x-1"
          style={{ color: "rgba(255,255,255,0.4)" }}
        />
      )}
    </span>
  );
}

export default function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    onClose();
    try {
      await logoutUser();
    } finally {
      navigate("/login", { replace: true });
    }
  };

  return (
    <>
      {/* Mobile overlay - modern blur effect */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 backdrop-blur-sm bg-black/40 lg:hidden transition-all duration-300"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          flex flex-col z-30 shrink-0
          transition-all duration-300 ease-out
          fixed left-0 top-[55px] h-[calc(100vh-55px)]
          lg:static lg:top-auto lg:h-auto lg:self-stretch lg:translate-x-0
          ${isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0 lg:shadow-none"}
        `}
        style={{
          width: "260px",
          minWidth: "260px",
          backgroundColor: SIDEBAR_BG,
          backdropFilter: "blur(0px)",
          boxShadow: isOpen ? "2px 0 20px rgba(0,0,0,0.15)" : "none",
        }}
      >
        {/* Decorative top gradient line */}
        <div 
          className="h-0.5 w-full"
          style={{ 
            background: "linear-gradient(90deg, #90B4D4 0%, #C5E0F4 50%, transparent 100%)",
            opacity: 0.6
          }}
        />

        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          {NAV_ITEMS.map(({ label, to, icon: Icon }) => (
            <NavLink key={to} to={to} end onClick={onClose}>
              {({ isActive }) => (
                <NavItem label={label} icon={Icon} isActive={isActive} />
              )}
            </NavLink>
          ))}

          {/* Divider with modern style */}
          <div className="my-3 relative">
            <div
              className="absolute inset-0 flex items-center"
              style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
            />
            <div className="relative flex justify-center">
              <span 
                className="px-2 text-[10px] font-medium uppercase tracking-wider"
                style={{ 
                  color: "rgba(255,255,255,0.3)",
                  backgroundColor: SIDEBAR_BG,
                  fontFamily: "var(--font-app)"
                }}
              >
                Account
              </span>
            </div>
          </div>

          {/* Logout as a nav-style item */}
          <NavItem
            label="Logout"
            icon={LogOut}
            isActive={false}
            onClick={handleLogout}
          />
        </nav>

        {/* Footer version info */}
        <div className="px-4 py-3 text-center">
          <p 
            className="text-[10px] font-medium tracking-wider"
            style={{ 
              color: "rgba(255,255,255,0.25)",
              fontFamily: "var(--font-app)"
            }}
          >
            v2.0.0
          </p>
        </div>
      </aside>
    </>
  );
}
