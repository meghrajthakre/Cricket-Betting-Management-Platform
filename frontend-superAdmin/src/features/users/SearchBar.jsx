import { Plus, Search, X } from "lucide-react";

export default function SearchBar({ search, onSearchChange, onSearch, onClear, loading, onCreate }) {
  const submit = (event) => { event.preventDefault(); onSearch(); };
  return (
    <div className="flex flex-col gap-3 border-b border-(--color-border) p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <form onSubmit={submit} className="flex w-full gap-2 sm:max-w-md">
        <div className="relative min-w-0 flex-1"><Search className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" size={17} /><input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search by name or username..." className="w-full rounded-xl border border-(--color-border) bg-slate-50 py-2.5 pr-9 pl-10 text-sm outline-none focus:border-(--color-banner) focus:bg-white focus:ring-3 focus:ring-blue-100" />{search && <button type="button" onClick={onClear} className="absolute top-1/2 right-2 grid h-7 w-7 -translate-y-1/2 place-items-center text-gray-400"><X size={15} /></button>}</div>
        <button type="submit" disabled={loading} className="rounded-xl border border-(--color-border) px-4 py-2 text-sm font-bold text-(--color-primary) disabled:opacity-50">Search</button>
      </form>
      <button type="button" onClick={onCreate} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-(--color-btn-bg) px-4 py-2.5 text-sm font-bold text-white transition hover:bg-(--color-btn-hover) sm:w-auto"><Plus size={18} />Create User</button>
    </div>
  );
}
