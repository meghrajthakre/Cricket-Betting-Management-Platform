import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    const resetScroll = () => window.scrollTo(0, 0);
    resetScroll();

    const frame = window.requestAnimationFrame(resetScroll);
    // iOS Safari restores the keyboard-adjusted offset after the first paint.
    const timer = window.setTimeout(resetScroll, 350);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [pathname]);

  return null;
}
