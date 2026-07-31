import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useCoinStore } from "../store/coinStore";
import { logoutUser , getWalletBalance} from "../api/userService";
import { MdSportsCricket } from "react-icons/md";

const NAV_ITEMS = [
  {
    key: "dashboard",
    label: "HOME",
    icon: "ri-home-4-line",
    path: "/dashboard",
  },
  {
    key: "live",
    label: "LIVE MATCH",
    icon: MdSportsCricket,
    path: "/dashboard/live",
  },
  { key: "logout", label: "LOGOUT", icon: "ri-shut-down-line", path: null },
];

const CoinIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 64 64"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: "inline", verticalAlign: "middle", flexShrink: 0 }}
  >
    <style>{`
      @keyframes coinBob {
        0%,100% { transform: translateY(0px); }
        50%      { transform: translateY(-2px); }
      }
      @keyframes shineFlash {
        0%,60%,100% { opacity: 0; }
        30%          { opacity: 0.85; }
      }
      @keyframes glowPulse {
        0%,100% { filter: drop-shadow(0 0 2px #F5C51888); }
        50%      { filter: drop-shadow(0 0 6px #F5C518cc); }
      }
      .coin-root  { animation: coinBob 2s ease-in-out infinite, glowPulse 2s ease-in-out infinite; }
      .coin-shine { animation: shineFlash 2.5s ease-in-out infinite; }
    `}</style>

    <g className="coin-root">
      <ellipse cx="32" cy="60" rx="14" ry="3" fill="rgba(0,0,0,0.18)" />
      <circle cx="32" cy="32" r="26" fill="#B8860B" />
      <circle cx="32" cy="32" r="24" fill="#DAA520" />
      <circle cx="32" cy="32" r="22" fill="#F5C518" />
      <circle
        cx="32"
        cy="32"
        r="18"
        fill="none"
        stroke="#C8960C"
        strokeWidth="1.5"
      />
      {[...Array(16)].map((_, i) => {
        const angle = (i * 360) / 16;
        const rad = (angle * Math.PI) / 180;
        const x1 = 32 + 22 * Math.cos(rad);
        const y1 = 32 + 22 * Math.sin(rad);
        const x2 = 32 + 25 * Math.cos(rad);
        const y2 = 32 + 25 * Math.sin(rad);
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#C8960C"
            strokeWidth="1"
          />
        );
      })}
      <text
        x="32"
        y="33"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Inter, sans-serif"
        fontWeight="800"
        fontSize="22"
        fill="#7A5C00"
        letterSpacing="-1"
      >
        $
      </text>
      <ellipse
        cx="24"
        cy="22"
        rx="8"
        ry="4.5"
        fill="white"
        transform="rotate(-30 24 22)"
        opacity="0"
        className="coin-shine"
      />
    </g>
  </svg>
);

const Navbar = () => {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const coins = useCoinStore((state) => state.coins);
  const setCoins = useCoinStore((state) => state.setCoins);

  const navigate = useNavigate();
  const location = useLocation();

  const username = user?.username ?? "Guest";
  const firstName = user?.firstName ?? "";

  // Fetch wallet balance from API on mount and when user changes
  useEffect(() => {
    if (!user?._id) return;

    const fetchBalance = async () => {
      try {
        const res = await getWalletBalance(user._id);
        setCoins(res.data.data.balance);
      } catch {
        // silently fail — coins will stay as whatever is in the store
      }
    };

    fetchBalance();
  }, [setCoins, user?._id]);

  const getActiveKey = () => {
    const path = location.pathname;
    if (path === "/dashboard") return "dashboard";
    if (path === "/dashboard/live") return "live";
    if (path.startsWith("/match/")) return "live";
    return "dashboard";
  };

  const activeKey = getActiveKey();

  const confirmLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      await logoutUser();
    } catch {
      /* silent */
    } finally {
      logout();
      setCoins(0);
      localStorage.removeItem("token");
      localStorage.removeItem("userAccessToken");
      navigate("/");
    }
  };

  const handleNavClick = (key, path) => {
    if (key === "logout") {
      setShowLogoutConfirm(true);
    } else if (path) {
      navigate(path);
    }
  };

  return (
    <header className="flex flex-col">
      <div
        className="
        h-14 sm:h-16 w-full
        bg-(--color-primary)
        shadow-[0_2px_12px_rgba(0,0,0,0.28)]
        flex items-center justify-between
        gap-1.5 px-2 sm:px-4 lg:px-6 border-b border-[rgba(214,228,245,0.15)]
      "
      >
        {/* ── User info ── */}
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-2.5">
          {/* Avatar circle */}
          <div
            className="
            w-8 h-8 rounded-full flex-shrink-0 max-[350px]:hidden
            bg-[rgba(255,255,255,0.12)]
            border border-[rgba(214,228,245,0.3)]
            flex items-center justify-center
            font-rajdhani font-bold text-sm
            text-(--color-text-muted)
            uppercase
          "
          >
            {(firstName || username).charAt(0)}
          </div>

          {/* Text block */}
          <div className="leading-tight min-w-0 font-nunito">
            {/* Username + firstname row */}
            <div className="flex min-w-0 items-center gap-1 sm:gap-1.5">
              <span
                className="
                    hidden min-[390px]:block text-xs sm:text-sm font-semibold
                    text-(--color-text-muted)
                    max-w-[62px] sm:max-w-[110px] lg:max-w-[150px]
                    truncate tracking-wide
              "
              >
                {username}
              </span>

              {firstName && (
                <>
                  <span className="hidden min-[390px]:inline text-[rgba(214,228,245,0.3)] text-xs">
                    |
                  </span>
                  <span
                    className="
                    block min-w-0 truncate text-sm sm:text-base font-bold
                    text-(--color-text-muted)
                    max-w-[76px] sm:max-w-[120px] lg:max-w-[160px]
                    tracking-wide
                  "
                  >
                    {firstName}
                  </span>
                </>
              )}
            </div>

            {/* Coins row */}
            <div className="flex min-w-0 items-center gap-1 mt-0.5">
              <CoinIcon />
              <span
                className="
                text-[11px] sm:text-xs
                font-semibold
                text-[#F5C518]
                max-w-[90px] truncate tracking-wide
              "
              >
                {Number(coins).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex shrink-0 items-center gap-0.5 sm:gap-1 lg:gap-2" aria-label="Primary navigation">
          {NAV_ITEMS.map(({ key, label, icon: Icon, path }) => {
            const isActive = activeKey === key && key !== "logout";
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleNavClick(key, path)}
                aria-label={label}
                aria-current={isActive ? "page" : undefined}
                title={label}
                className={`
                  relative flex items-center justify-center
                  gap-1.5 lg:gap-2
                  w-10 h-10 lg:w-auto lg:h-auto
                  lg:px-4 lg:py-2
                  rounded-lg
                  font-rajdhani text-xs lg:text-sm font-semibold tracking-wide
                  text-(--color-text-muted)
                  transition-all duration-150
                  cursor-pointer
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent)
                  ${
                    isActive
                      ? "border border-[rgba(214,228,245,0.65)] bg-[rgba(255,255,255,0.12)] after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-1/2 after:h-0.5 after:bg-(--color-accent) after:rounded-full"
                      : "border border-transparent bg-transparent hover:bg-[rgba(255,255,255,0.12)]"
                  }
                `}
              >
                {typeof Icon === "string"
                  ? <i className={`${Icon} text-lg`} aria-hidden="true" />
                  : <Icon className="text-xl" aria-hidden="true" />}
                <span className="hidden lg:inline whitespace-nowrap">{label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#07182a]/65 px-4 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-confirm-title"
          onClick={() => !loggingOut && setShowLogoutConfirm(false)}
        >
          <div
            className="w-full max-w-sm rounded-lg border border-(--color-btn-border) bg-(--color-bg-card) p-5 text-center shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-(--color-accent) bg-white/10 text-(--color-text-muted)">
              <i className="ri-logout-box-r-line text-2xl" aria-hidden="true" />
            </div>
            <h2 id="logout-confirm-title" className="mt-3 font-rajdhani text-xl font-bold text-(--color-text-muted)">
              Are you sure you want to logout?
            </h2>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={loggingOut}
                onClick={() => setShowLogoutConfirm(false)}
                className="rounded-md border border-(--color-accent) bg-transparent px-4 py-2.5 font-semibold text-(--color-text-muted) hover:bg-white/10 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loggingOut}
                onClick={confirmLogout}
                className="rounded-md border border-(--color-btn-border) bg-(--color-btn-bg) px-4 py-2.5 font-semibold text-(--color-text-muted) hover:bg-(--color-btn-hover) disabled:opacity-60"
              >
                {loggingOut ? "Logging out..." : "Logout"}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
