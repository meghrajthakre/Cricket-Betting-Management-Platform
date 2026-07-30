import { Menu, User } from "lucide-react";

export default function Navbar({ onMenuClick }) {
  return (
    <header
      className="flex items-center justify-between px-4 z-30 relative shrink-0"
      style={{
        backgroundColor: "#ffffff",
        borderBottom: "1px solid #e5e7eb",
        color: "var(--color-text-dark)",
        height: "55px",
      }}
    >
      {/* Left: hamburger + brand */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-1.5 rounded-md transition-colors hover:bg-gray-100 active:bg-gray-200"
          aria-label="Toggle sidebar"
        >
          <Menu size={20} style={{ color: "var(--color-text-dark)" }} />
        </button>

        <span
          className="text-xl font-bold tracking-wide"
          style={{
            fontFamily: "var(--font-app)",
            color: "var(--color-text-dark)",
          }}
        >
          Sonu7777
        </span>
      </div>

      {/* Right: user */}
      <div
        className="flex items-center gap-1.5 text-sm font-semibold"
        style={{
          fontFamily: "var(--font-app)",
          color: "var(--color-text-dark)",
        }}
      >
        <User size={17} />
        <span className="hidden xs:inline sm:inline">Superadmin</span>
      </div>
    </header>
  );
}
