import { useEffect, useState } from "react";
import { Megaphone, Save, Loader2 } from "lucide-react";
import { getBanner, updateBanner } from "../services/userService"; // adjust path if needed

const MAX = 500;

export default function MarqueeBannerManager() {
  const [text,      setText]    = useState("");
  const [status,    setStatus]  = useState("idle"); // "idle" | "loading" | "saving" | "ok" | "err"
  const [charCount, setCharCount] = useState(0);

  // ── Load current banner on mount ────────────────────────────────────────
  useEffect(() => {
    setStatus("loading");
    getBanner()
      .then(({ data }) => {
        const t = data?.text || "";
        setText(t);
        setCharCount(t.length);
        setStatus("idle");
      })
      .catch(() => setStatus("idle"));
  }, []);

  const handleChange = (e) => {
    const val = e.target.value.slice(0, MAX);
    setText(val);
    setCharCount(val.length);
    if (status === "ok" || status === "err") setStatus("idle");
  };

  const handleSave = async () => {
    if (!text.trim() || status === "saving") return;
    setStatus("saving");
    try {
      await updateBanner(text.trim());
      setStatus("ok");
      setTimeout(() => setStatus("idle"), 3500);
    } catch {
      setStatus("err");
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-100"
        style={{ backgroundColor: "#f8fafc" }}
      >
        <Megaphone size={15} strokeWidth={2} color="#2E4151" />
        <span
          className="text-sm font-semibold"
          style={{ color: "#2E4151", fontFamily: "var(--font-app)" }}
        >
          Marquee Banner
        </span>
        <span className="ml-auto text-xs text-gray-400" style={{ fontFamily: "var(--font-app)" }}>
          Visible to all users
        </span>
      </div>

      <div className="px-5 py-5 space-y-4">

        {/* ── Live preview ────────────────────────────────────────────────── */}
        <div>
          <label
            className="block text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5"
            style={{ fontFamily: "var(--font-app)" }}
          >
            Preview
          </label>
          <div
            className="h-9 rounded-lg overflow-hidden flex items-center"
            style={{ backgroundColor: "#1a2a38", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            {text ? (
              <span
                className="inline-block whitespace-nowrap animate-marquee font-bold"
                style={{ fontFamily: "var(--font-app)", fontSize: "13px", color: "#fbbf24", letterSpacing: "0.03em" }}
              >
                {text}
              </span>
            ) : (
              <span
                className="px-4 text-xs"
                style={{ color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-app)" }}
              >
                No banner text set
              </span>
            )}
          </div>
        </div>

        {/* ── Input ───────────────────────────────────────────────────────── */}
        <div>
          <label
            htmlFor="marquee-input"
            className="block text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5"
            style={{ fontFamily: "var(--font-app)" }}
          >
            Banner Text
          </label>
          <textarea
            id="marquee-input"
            rows={3}
            value={status === "loading" ? "" : text}
            onChange={handleChange}
            disabled={status === "loading" || status === "saving"}
            placeholder="e.g.  ‖ WELCOME TO Sonu Book GROUP ‖     Jo Group bets Karte he unke Profit..."
            className="
              w-full rounded-lg border border-gray-200 bg-gray-50
              px-3.5 py-2.5 text-sm text-gray-800
              placeholder:text-gray-300
              focus:outline-none focus:ring-2 focus:border-[#2E4151]
              disabled:opacity-50 disabled:cursor-not-allowed
              resize-none transition
            "
            style={{ fontFamily: "var(--font-app)", focusRingColor: "#2E415133" }}
          />
          {/* char counter */}
          <div className="flex justify-end mt-1">
            <span
              className={`text-[11px] font-medium ${charCount >= MAX ? "text-red-400" : "text-gray-300"}`}
              style={{ fontFamily: "var(--font-app)" }}
            >
              {charCount} / {MAX}
            </span>
          </div>
        </div>

        {/* ── Save button + feedback ───────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={status === "saving" || status === "loading" || !text.trim()}
            className="
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white
              hover:opacity-90 active:scale-[0.98]
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-150
            "
            style={{ backgroundColor: "#2E4151", fontFamily: "var(--font-app)" }}
          >
            {status === "saving" ? (
              <Loader2 size={14} strokeWidth={2} className="animate-spin" />
            ) : (
              <Save size={14} strokeWidth={2} />
            )}
            {status === "saving" ? "Saving…" : "Save Banner"}
          </button>

          {status === "ok" && (
            <span
              className="text-sm font-medium text-green-500"
              style={{ fontFamily: "var(--font-app)" }}
            >
              ✓ Saved — users see the new text within 30 s
            </span>
          )}
          {status === "err" && (
            <span
              className="text-sm font-medium text-red-400"
              style={{ fontFamily: "var(--font-app)" }}
            >
              ✗ Failed to save. Try again.
            </span>
          )}
        </div>

      </div>
    </div>
  );
}
