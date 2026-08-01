import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Eye, Megaphone, Save } from "lucide-react";
import Spinner from "../components/common/Spinner";
import { getBanner, updateBanner } from "../services/userService";

const MAX_CHARS = 500;

export default function MarqueeBannerManager() {
  const [text, setText] = useState("");
  const [savedText, setSavedText] = useState("");
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    getBanner()
      .then(({ data }) => {
        const bannerText = data?.text || "";
        setText(bannerText);
        setSavedText(bannerText);
        setStatus("idle");
      })
      .catch(() => setStatus("load-error"));
  }, []);

  const handleChange = (event) => {
    setText(event.target.value.slice(0, MAX_CHARS));
    if (status === "success" || status === "save-error") setStatus("idle");
  };

  const handleSave = async () => {
    const nextText = text.trim();
    if (!nextText || status === "saving") return;

    setStatus("saving");
    try {
      await updateBanner(nextText);
      setText(nextText);
      setSavedText(nextText);
      setStatus("success");
    } catch {
      setStatus("save-error");
    }
  };

  const isLoading = status === "loading";
  const isSaving = status === "saving";
  const hasChanges = text.trim() !== savedText;

  return (
    <section className="animate-fade-up overflow-hidden rounded-2xl border border-(--color-border) bg-white shadow-sm">
      <header className="relative overflow-hidden bg-(--color-primary) px-5 py-5 text-white sm:px-7 sm:py-6">
        <div className="absolute -top-16 -right-10 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute -right-4 -bottom-20 h-36 w-36 rounded-full bg-(--color-banner)/35" />
        <div className="relative flex items-start gap-4">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/10">
            <Megaphone aria-hidden="true" size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">Marquee Banner</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-(--color-text-muted)">
              Create the announcement displayed across the user dashboard.
            </p>
          </div>
        </div>
      </header>

      <div className="space-y-6 p-5 sm:p-7">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-(--color-text-dark)">
              <Eye aria-hidden="true" size={15} className="text-(--color-banner)" />
              Live Preview
            </div>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-(--color-primary)">
              Visible to all users
            </span>
          </div>

          <div className="flex h-12 items-center overflow-hidden rounded-xl border border-white/10 bg-[#07182A] shadow-inner">
            {isLoading ? (
              <div className="flex items-center gap-2 px-4 text-xs text-white/50">
                <Spinner size={15} variant="neon" label="Banner loading" />
                Loading preview...
              </div>
            ) : text.trim() ? (
              <span className="inline-block whitespace-nowrap animate-marquee px-4 text-sm font-bold tracking-wide text-amber-300">
                {text}
              </span>
            ) : (
              <span className="px-4 text-xs font-medium text-white/35">Your banner preview will appear here</span>
            )}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-end justify-between gap-4">
            <label htmlFor="marquee-input" className="text-sm font-semibold text-(--color-text-dark)">
              Banner message
            </label>
            <span className={`text-xs font-semibold ${text.length >= MAX_CHARS ? "text-red-500" : "text-gray-400"}`}>
              {text.length}/{MAX_CHARS}
            </span>
          </div>
          <textarea
            id="marquee-input"
            rows={5}
            value={text}
            onChange={handleChange}
            disabled={isLoading || isSaving}
            placeholder="Enter an announcement for your users..."
            className="w-full resize-none rounded-xl border border-(--color-border) bg-slate-50 px-4 py-3 text-sm leading-6 text-(--color-text-dark) outline-none transition placeholder:text-gray-400 hover:border-(--color-accent) focus:border-(--color-banner) focus:bg-white focus:ring-3 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <p className="mt-2 text-xs leading-5 text-gray-400">
            Keep the message short and clear so users can read it while it scrolls.
          </p>
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-h-5">
            {status === "success" && (
              <p className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
                <CheckCircle2 aria-hidden="true" size={17} />
                Banner updated successfully.
              </p>
            )}
            {(status === "save-error" || status === "load-error") && (
              <p className="flex items-center gap-2 text-sm font-semibold text-red-500">
                <AlertCircle aria-hidden="true" size={17} />
                {status === "load-error" ? "Could not load the current banner." : "Could not save the banner. Please try again."}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading || isSaving || !text.trim() || !hasChanges}
            className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-(--color-btn-bg) px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-(--color-btn-hover) hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none sm:w-auto"
          >
            {isSaving ? (
              <Spinner size={17} variant="neon" label="Banner saving" />
            ) : (
              <Save aria-hidden="true" size={17} />
            )}
            {isSaving ? "Saving..." : "Save Banner"}
          </button>
        </div>
      </div>
    </section>
  );
}
