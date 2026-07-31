import { useEffect, useState, useRef } from "react";
import { getBanner } from "../api/userService";

const POLL_MS = 30000;
const MARQUEE_DURATION = "15s"; // ← adjust speed here

export default function MarqueeBanner() {
  const [text, setText] = useState("");
  const [status, setStatus] = useState("loading");
  const timerRef = useRef(null);

  const fetchBanner = async () => {
    try {
      const result = await getBanner();
      if (result?.data?.text) setText(result.data.text);
      setStatus("done");
    } catch (err) {
      console.error("Banner error:", err);
      setStatus("error");
    }
  };

  useEffect(() => {
    const initialTimer = setTimeout(fetchBanner, 0);
    timerRef.current = setInterval(fetchBanner, POLL_MS);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(timerRef.current);
    };
  }, []);

  if (status === "error" || (status === "done" && !text)) return null;

  if (status === "loading") {
    return (
      <div className="h-8 flex items-center px-4 text-xs text-gray-400 bg-[var(--color-primary)]">
        Loading...
      </div>
    );
  }

  const item = (
    <span className="flex items-center gap-3 px-10 whitespace-nowrap font-rajdhani text-xs sm:text-sm font-semibold tracking-widest uppercase text-[var(--color-text-muted)]">
      <span className="text-[var(--color-accent)]">★</span>
      {text}
      <span className="text-[var(--color-accent)]">★</span>
    </span>
  );

  return (
    <div className="w-full h-8 bg-[var(--color-primary)] border-b border-[rgba(214,228,245,0.15)] overflow-hidden flex items-center">
      <div className="relative w-full overflow-hidden">
        {/* Two exact copies — animation slides by -50% so copy 1 ends exactly where copy 2 begins */}
        <div
          className="flex w-max"
          style={{ animation: `marquee ${MARQUEE_DURATION} linear infinite` }}
        >
          {item}
          {item}
        </div>
      </div>
    </div>
  );
}
