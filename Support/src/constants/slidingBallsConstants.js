// ---------------------------------------------------------------------
//  SlidingBalls constants
//  Centralizes colors, sizing, and display rules for the ball-chip strip
//  so they can be tuned in one place instead of inside the component.
// ---------------------------------------------------------------------

// How many most-recent balls to show in the strip
export const MAX_DISPLAY_BALLS = 7;

// Chip color styles by ball outcome (Tailwind class strings)
export const BALL_STYLES = {
    wicket: "bg-[#b3261e] text-white border-[#b3261e]",
    extra: "bg-[#c9861a] text-white border-[#c9861a]",
    boundary: "bg-[#2f7a34] text-white border-[#2f7a34]", // 4s and 6s
    dot: "bg-gray-200 text-[#3a4a63] border-gray-300",     // 0 runs
    default: "bg-[#4a80a0] text-white border-[#4a80a0]",   // 1, 2, 3, 5 runs
};

// Chip sizing / shape
export const BALL_CHIP_CLASSES =
    "flex items-center justify-center shrink-0 w-8 h-8 rounded-full border-2 text-xs font-bold";

// Short labels for simple, single-outcome balls (fallback logic in the component)
export const SHORT_LABELS = {
    wicket: "W",
    wide: "Wd",
    noBall: "Nb",
    extraFallback: "Ex",
};

// ---------------------------------------------------------------------
//  Exact-match map: raw ScoreButtons label (uppercased) -> chip text
//  Covers every scoring button, including combos, so the chip shows
//  the full real outcome (e.g. "4 + No Ball" -> "4Nb") instead of just
//  falling back to the plain run count.
// ---------------------------------------------------------------------
export const LABEL_SHORT_MAP = {
    // Plain runs
    "0 RUN": "0",
    "1 RUN": "1",
    "2 RUN": "2",
    "3 RUN": "3",
    "4 RUN": "4",
    "5 RUN": "5",
    "6 RUN": "6",

    // Wicket
    "OUT": "W",
    "NOT OUT": "NW", // shown only if NOT OUT is ever stored as its own ball

    // Plain extras
    "WIDE BALL": "Wd",
    "NO BALL": "Nb",

    // Run + Wide Ball combos
    "1 + WIDE BALL": "1Wd",
    "2 + WIDE BALL": "2Wd",
    "3 + WIDE BALL": "3Wd",
    "4 + WIDE BALL": "4Wd",

    // Run + No Ball combos
    "1 + NO BALL": "1Nb",
    "2 + NO BALL": "2Nb",
    "3 + NO BALL": "3Nb",
    "4 + NO BALL": "4Nb",
    "6 + NO BALL": "6Nb",

    // Wicket combos
    "1 + OUT": "1W",
    "2 + OUT": "2W",
    "WIDE BALL + OUT": "WdW",
};

// ---------------------------------------------------------------------
//  Exact-match map: raw label (uppercased) -> style key (BALL_STYLES key)
//  Lets combo balls pick the "most important" color — wicket beats
//  extra, extra beats boundary/default — without extra logic in the UI.
// ---------------------------------------------------------------------
export const LABEL_STYLE_MAP = {
    "0 RUN": "dot",
    "1 RUN": "default",
    "2 RUN": "default",
    "3 RUN": "default",
    "4 RUN": "boundary",
    "5 RUN": "default",
    "6 RUN": "boundary",

    "OUT": "wicket",

    "WIDE BALL": "extra",
    "NO BALL": "extra",

    "1 + WIDE BALL": "extra",
    "2 + WIDE BALL": "extra",
    "3 + WIDE BALL": "extra",
    "4 + WIDE BALL": "extra",

    "1 + NO BALL": "extra",
    "2 + NO BALL": "extra",
    "3 + NO BALL": "extra",
    "4 + NO BALL": "extra",
    "6 + NO BALL": "extra",

    "1 + OUT": "wicket",
    "2 + OUT": "wicket",
    "WIDE BALL + OUT": "wicket",
};

// Text shown when there's no ball history yet
export const EMPTY_STATE_TEXT = "No balls bowled yet";

// Runs that count as a "boundary" for coloring purposes
export const BOUNDARY_RUNS = [4, 6];