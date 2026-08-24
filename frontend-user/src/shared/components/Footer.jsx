import { NavLink } from "react-router-dom";

const FOOTER_LINKS = [
  { to: "/dashboard", label: "Home", icon: "ri-home-4-line", end: true },
  { to: "/dashboard/live", label: "Live Matches", icon: "ri-broadcast-line" },
  { to: "/dashboard/rules", label: "Rules", icon: "ri-information-line" },
  { to: "/dashboard/ledger", label: "Ledger", icon: "ri-file-list-3-line" },
  { to: "/dashboard/password", label: "Password", icon: "ri-lock-password-line" },
  { to: "/dashboard/settings", label: "Settings", icon: "ri-settings-3-line" },
];

export default function Footer() {
  return (
    <footer className="mt-auto border-t-4 border-(--color-banner) bg-(--color-primary) font-nunito text-(--color-text-muted)">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col items-center gap-7">
          <div className="text-center">
            <h2 className="font-rajdhani text-xl font-bold uppercase tracking-[0.16em] text-white sm:text-2xl">
              Sonu Book Group
            </h2>
            <p className="mt-1.5 text-xs tracking-wide text-(--color-text-muted)/65 sm:text-sm">
              Trusted · Transparent · Fair Play
            </p>
          </div>

          <nav aria-label="Footer navigation">
            <ul className="flex max-w-3xl flex-wrap items-center justify-center gap-2 sm:gap-3">
              {FOOTER_LINKS.map(({ to, label, icon, end }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    className={({ isActive }) => `flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition sm:px-4 sm:text-sm ${
                      isActive
                        ? "border-(--color-accent) bg-(--color-primary-light) text-white"
                        : "border-white/15 text-(--color-text-muted)/80 hover:border-white/35 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <i className={`${icon} text-base`} aria-hidden="true" />
                    <span>{label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="h-px w-full bg-white/15" />

          <p className="text-center text-xs tracking-wide text-(--color-text-muted)/55">
            © {new Date().getFullYear()} Sonu Book Group. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
