import React, { useState } from "react";

/* ------------------------------------------------------------------ */
/*  ScoreButtons                                                       */
/*  - Grid of quick-action buttons (runs, wickets, breaks, etc.)       */
/*  - Highlighted (yellow) buttons represent active/alert states       */
/*  - Selected button gets a distinct "pressed" style                  */
/* ------------------------------------------------------------------ */

const DEFAULT_ROWS = [
  [
    { label: "2 RUN" },
    { label: "3 RUN" },
    { label: "BET CLOSED" },
    { label: "4 RUN", active: true },
    { label: "6 RUN", active: true },
    { label: "Boundry Check" },
    { label: "5 RUN" },
    { label: "Catch Check" },
    { label: "Catch Drop" },
  ],
  [
    { label: "0 RUN" },
    { label: "BET OPEN" },
    { label: "1 RUN" },
    { label: "OUT", active: true },
    { label: "NOT OUT" },
    { label: "No Ball", active: true },
    { label: "FREE HIT" },
  ],
  [
    { label: "SCORE BACK" },
    { label: "BALL START" },
    { label: "THIRD UMPIRE", active: true },
    { label: "WIDE BALL" },
    { label: "DRINK BREAK" },
    { label: "Player Injured" },
    { label: "RAINING" },
    { label: "TIE" },
    { label: "TIME OUT" },
  ],
  [
    { label: "INNING BREAK", active: true },
    { label: "1 + WIDE BALL" },
    { label: "2 + WIDE BALL" },
    { label: "3 + WIDE BALL" },
    { label: "4 + WIDE BALL" },
    { label: "1 + OUT" },
    { label: "2 + OUT" },
  ],
  [
    { label: "1 + No Ball" },
    { label: "2 + No Ball" },
    { label: "3 + No Ball" },
    { label: "4 + No Ball" },
    { label: "6 + No Ball" },
    { label: "WIDE BALL + OUT" },
    { label: "TEA BREAK" },
    { label: "LUNCH BREAK" },
  ],
  [
    { label: "Stumps" },
    { label: "Wide Ball Review" },
    { label: "No Ball Review" },
    { label: "Catch Check" },
    { label: "Catch Drop" },
    { label: "DINNER BREAK" },
    { label: "BAD LIGHT" },
  ],
];

export default function ScoreButtons({ rows = DEFAULT_ROWS, onSelect, selected: controlledSelected }) {
  const [internalSelected, setInternalSelected] = useState(null);

  // Support both controlled (parent passes `selected`) and uncontrolled use
  const selected = controlledSelected !== undefined ? controlledSelected : internalSelected;

  const handleClick = (label) => {
    if (controlledSelected === undefined) {
      setInternalSelected(label);
    }
    onSelect?.(label);
  };

  return (
    <div className="w-full bg-[#f0f0f0] border border-gray-200">

      {rows.map((row, rowIdx) => (
        <div
          key={rowIdx}
          className={`flex flex-wrap items-center gap-3 px-4 py-3 ${
            rowIdx !== rows.length - 1 ? "border-b border-gray-300" : ""
          }`}
        >
          {row.map((btn) => {
            const isSelected = selected === btn.label;
            return (
              <button
                key={btn.label}
                type="button"
                onClick={() => handleClick(btn.label)}
                className={`cursor-pointer select-none px-4 py-2 rounded-md text-xs sm:text-sm font-semibold whitespace-nowrap
                  transition-all duration-150 ease-in-out 
                  active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-1
                  ${
                    isSelected
                      ? "bg-[#c0392b] text-white ring-2 ring-offset-1 ring-[#c0392b] shadow-md scale-[1.03]"
                      : btn.active
                      ? "bg-[#f3c14a] text-[#2b3a55] hover:bg-[#eab834] focus:ring-[#eab834]"
                      : "bg-[#3f8f7f] text-white hover:bg-[#347666] focus:ring-[#347666]"
                  }`}
              >
                {btn.label}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}