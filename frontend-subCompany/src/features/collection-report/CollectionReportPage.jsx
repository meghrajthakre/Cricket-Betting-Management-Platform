import { FileBarChart2 } from "lucide-react";

export default function CollectionReportPage() {
  return (
    <section className="animate-fade-up">
      <header className="rounded-2xl bg-(--color-primary) p-6 text-white">
        <h1 className="text-2xl font-extrabold">Collection Report</h1>
        <p className="mt-1 text-sm text-(--color-text-muted)">
          Your company collection and profit/loss share.
        </p>
      </header>
      <div className="mt-5 grid min-h-72 place-items-center rounded-2xl border border-(--color-border) bg-white p-6 text-center shadow-sm">
        <div>
          <FileBarChart2 size={42} className="mx-auto text-(--color-accent)" />
          <h2 className="mt-3 font-bold text-(--color-primary)">
            No collection entries yet
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            Settled collection entries will appear here.
          </p>
        </div>
      </div>
    </section>
  );
}
