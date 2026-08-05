import { Building2, Menu } from "lucide-react";

export default function Navbar({ onMenu }) {
  return (
    <header className="relative z-30 flex h-[55px] shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4">
      <button
        type="button"
        onClick={onMenu}
        aria-label="Toggle menu"
        className="rounded-lg p-2 transition hover:bg-gray-100"
      >
        <Menu size={20} />
      </button>
      <span className="text-lg font-extrabold tracking-wide text-(--color-text-dark)">
        Sonu7777
      </span>
      <span className="flex items-center gap-2 text-sm font-bold text-(--color-primary)">
        <Building2 size={17} />
        <span className="hidden sm:inline">Sub Company</span>
      </span>
    </header>
  );
}
