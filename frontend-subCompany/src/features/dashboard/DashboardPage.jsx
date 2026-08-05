import { Building2, FileBarChart2, NotebookTabs, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { getMe } from "../../shared/api/authApi";

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    getMe(controller.signal)
      .then((response) => setUser(response?.data?.user))
      .catch(() => {});
    return () => controller.abort();
  }, []);
  const cards = [
    {
      label: "Company Share",
      value: `${Number(user?.downlineShare || 0)}%`,
      icon: Building2,
    },
    { label: "My Users", value: "View report", icon: Users },
    { label: "Collection", value: "Collection Report", icon: FileBarChart2 },
    { label: "Ledger", value: "My Ledger", icon: NotebookTabs },
  ];
  return (
    <section className="animate-fade-up space-y-5">
      <header className="rounded-2xl bg-(--color-primary) p-6 text-white shadow-sm">
        <p className="text-sm text-(--color-text-muted)">Welcome back</p>
        <h1 className="mt-1 text-2xl font-extrabold">
          {user?.firstName || "Sub Company"}
        </h1>
        <p className="mt-1 text-xs text-white/50">{user?.username}</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <article
            key={label}
            className="rounded-2xl border border-(--color-border) bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-(--color-primary)">
              <Icon size={20} />
            </div>
            <p className="mt-4 text-xs font-bold uppercase tracking-wide text-gray-400">
              {label}
            </p>
            <p className="mt-1 font-extrabold text-(--color-text-dark)">
              {value}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
