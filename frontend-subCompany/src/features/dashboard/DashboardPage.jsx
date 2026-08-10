import { useEffect, useState } from "react";
import { getMe } from "../../shared/api/authApi";

const formatNumber = (value) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 });
const formatRole = (role) => role ? role.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "—";

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    getMe(controller.signal).then((response) => setUser(response?.data?.user)).catch(() => {}).finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const cards = [
    { label: "My Username", value: user?.username || "—", detail: user?.firstName || "" },
    { label: "My Level", value: formatRole(user?.role) },
    { label: "My Fix Limit", value: formatNumber(user?.fixLimit) },
    { label: "Company Contact", value: user?.mobile || "—" },
    { label: "Maximum My Share", value: `${formatNumber(user?.myShare)}%` },
    { label: "Minimum Company Share", value: `${formatNumber(user?.downlineShare)}%` },
  ];

  return (
    <section className="animate-fade-up space-y-7">
      <header>
        <h1 className="text-2xl font-medium uppercase text-slate-600 sm:text-3xl">Dashboard</h1>
        <div className="mt-3 flex items-center gap-3 text-sm"><span className="text-slate-500">Dashboard</span><span className="text-slate-300">/</span>{loading ? <span className="h-4 w-32 animate-pulse rounded bg-slate-200" /> : <span className="font-semibold text-slate-600">{user?.username}{user?.firstName ? ` (${user.firstName})` : ""}</span>}</div>
      </header>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <article key={card.label} className="border-t-4 border-slate-200 bg-white shadow-xs">
            <h2 className="border-b border-slate-200 px-5 py-3.5 text-sm font-bold text-slate-600">{card.label}</h2>
            <div className="min-h-24 px-6 py-5">
              {loading ? <div className="space-y-2 animate-pulse"><div className="h-8 w-32 rounded bg-slate-200" /><div className="h-3 w-20 rounded bg-slate-200" /></div> : <><p className="truncate text-3xl font-normal text-slate-600 tabular-nums">{card.value}</p>{card.detail && <p className="mt-1 text-sm text-slate-500">{card.detail}</p>}</>}
            </div>
          </article>
        ))}
      </div>

    </section>
  );
}
