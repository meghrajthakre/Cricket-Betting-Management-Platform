import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import useAuth from "../../../features/auth/hooks/useAuth";

const COLOR = "#1E3A5F";

const links = [
  { label: "HOME", path: "/support/matches" },
  { label: "Add Matches", path: "/support/matches/add" },
  { label: "Master Page", path: "/support/master" },
];

export default function SupportNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { logout } = useAuth();

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
    } catch {
      // Local auth is cleared even if the server logout request fails.
    } finally {
      navigate("/login", { replace: true });
      setIsLoggingOut(false);
    }
  };

  const handleNav = (path) => {
    navigate(path);
    setMenuOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav style={{ background: COLOR }} className="sticky top-0 z-50 shadow-md">
      <div className="px-4 sm:px-6 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">

          {/* Logo */}
          <span
            onClick={() => navigate("/support/matches")}
            className="text-white text-lg sm:text-xl font-semibold tracking-wide truncate cursor-pointer select-none"
          >
            {import.meta.env.VITE_APP_NAME || "Support"}
          </span>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {links.map((l) => (
              <button
                key={l.path}
                onClick={() => navigate(l.path)}
                className={`
                  relative cursor-pointer text-sm font-medium px-4 py-2 rounded-lg
                  transition-all duration-200
                  ${isActive(l.path)
                    ? "text-white bg-white/20"
                    : "text-white/80 hover:text-white hover:bg-white/15"
                  }
                `}
              >
                {l.label}
                {/* active underline */}
                {isActive(l.path) && (
                  <span className="absolute bottom-1 left-4 right-4 h-0.5 bg-white rounded-full" />
                )}
              </button>
            ))}

            {/* divider */}
            <div className="w-px h-5 bg-white/20 mx-2" />

            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              aria-busy={isLoggingOut}
              className="cursor-pointer text-sm font-medium px-4 py-2 rounded-lg
                         text-white/80 hover:text-white
                         border border-white/20 hover:border-white/50
                         hover:bg-white/15
                         transition-all duration-200
                         active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="flex min-w-[62px] items-center justify-center gap-2">
                {isLoggingOut && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                )}
                {isLoggingOut ? "Logging out..." : "Logout"}
              </span>
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen((p) => !p)}
            className="md:hidden text-white p-2 rounded-lg hover:bg-white/15
                       transition-all duration-200 focus:outline-none active:scale-95"
            aria-label="Toggle menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="md:hidden mt-2 pt-2 border-t border-white/20 space-y-0.5 pb-1">
            {links.map((l) => (
              <button
                key={l.path}
                onClick={() => handleNav(l.path)}
                className={`
                  flex items-center w-full text-left text-sm font-medium
                  px-3 py-2.5 rounded-lg transition-all duration-200
                  ${isActive(l.path)
                    ? "text-white bg-white/20"
                    : "text-white/80 hover:text-white hover:bg-white/15"
                  }
                `}
              >
                {/* active dot */}
                {isActive(l.path) && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white mr-2 shrink-0" />
                )}
                {l.label}
              </button>
            ))}

            <div className="pt-1 mt-1 border-t border-white/10">
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                aria-busy={isLoggingOut}
                className="flex items-center gap-2 w-full text-left text-sm font-medium
                           px-3 py-2.5 rounded-lg text-white/80 hover:text-white
                           hover:bg-white/15 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoggingOut ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                )}
                {isLoggingOut ? "Logging out..." : "Logout"}
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
