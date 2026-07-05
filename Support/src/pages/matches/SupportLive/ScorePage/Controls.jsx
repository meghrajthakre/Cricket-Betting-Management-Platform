import React, { useState } from "react";

/* ------------------------------------------------------------------ */
/*  Controls                                                           */
/*  - Table-style control panel for manual match updates               */
/*  - Matches: First Inn Bat / Second Inn Bat / Update Last Score /     */
/*    1st Inn Score / 1st Inn Score / Trail Run / Lead Run             */
/* ------------------------------------------------------------------ */

function Row({ label, children, borderBottom = true, striped = false }) {
  return (
    <div
      className={`flex items-center gap-4 px-6 py-3 ${
        striped ? "bg-[#eceff1]" : "bg-[#f5f6f7]"
      } ${borderBottom ? "border-b border-gray-300" : ""}`}
    >
      <div className="w-[140px] shrink-0 text-[#3a4a63] font-semibold text-sm">
        {label}
      </div>
      <div className="flex flex-wrap items-center gap-3 flex-1">
        {children}
      </div>
    </div>
  );
}

function TextInput({ value, onChange, width = "w-32", placeholder = "" }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`${width} border border-gray-400 rounded px-2 py-1.5 text-sm text-[#3a4a63] bg-[#eef1f3] placeholder-gray-400 focus:outline-none focus:border-[#4a80a0] focus:ring-1 focus:ring-[#4a80a0]`}
    />
  );
}

function LabeledInput({ label, value, onChange, width = "w-24", placeholder = "" }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-[#5a6b85] font-semibold">{label}</span>
      <TextInput value={value} onChange={onChange} width={width} placeholder={placeholder} />
    </div>
  );
}

function SubmitButton({ onClick, small = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`bg-[#4a80a0] hover:bg-[#3d6c88] active:bg-[#345a73] text-white font-semibold ${
        small ? "text-xs px-4 py-1.5" : "text-sm px-6 py-2"
      } rounded cursor-pointer transition-colors whitespace-nowrap shadow-sm`}
    >
      Submit
    </button>
  );
}

export default function Controls({ teams = [], onAction }) {
  const [firstInnBat, setFirstInnBat] = useState("");
  const [secondInnBat, setSecondInnBat] = useState("");

  const [lastScore, setLastScore] = useState({
    run: "",
    wicket: "",
    over: "",
    ball: "",
    decl: "",
  });

  const [firstInnScore1, setFirstInnScore1] = useState("");
  const [firstInnScore2, setFirstInnScore2] = useState("");
  const [trailRun, setTrailRun] = useState("0");
  const [leadRun, setLeadRun] = useState("0");

  const updateLastScoreField = (field) => (val) =>
    setLastScore((prev) => ({ ...prev, [field]: val }));

  const selectClasses =
    "border border-gray-400 rounded px-2 py-1.5 text-sm text-[#3a4a63] bg-[#eef1f3] cursor-pointer focus:outline-none focus:border-[#4a80a0] focus:ring-1 focus:ring-[#4a80a0] min-w-[140px]";

  return (
    <div className="w-full border border-gray-300 rounded overflow-hidden bg-[#f0f0f0] shadow-sm mt-3">
      {/* First Inn Bat */}
      <Row label="First Inn Bat">
        <select
          value={firstInnBat}
          onChange={(e) => setFirstInnBat(e.target.value)}
          className={selectClasses}
        >
          <option value="">Select Team</option>
          {teams.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <SubmitButton onClick={() => onAction?.("firstInnBat", { team: firstInnBat })} />
      </Row>

      {/* Second Inn Bat */}
      <Row label="Second Inn Bat" striped>
        <select
          value={secondInnBat}
          onChange={(e) => setSecondInnBat(e.target.value)}
          className={selectClasses}
        >
          <option value="">Select Team</option>
          {teams.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <SubmitButton onClick={() => onAction?.("secondInnBat", { team: secondInnBat })} />
      </Row>

      {/* Update Last Score */}
      <Row label="Update Last Score">
        <LabeledInput label="Run" value={lastScore.run} onChange={updateLastScoreField("run")} width="w-20" placeholder="0" />
        <LabeledInput label="Wicket" value={lastScore.wicket} onChange={updateLastScoreField("wicket")} width="w-20" placeholder="0" />
        <LabeledInput label="Over" value={lastScore.over} onChange={updateLastScoreField("over")} width="w-20" placeholder="0" />
        <LabeledInput label="Ball" value={lastScore.ball} onChange={updateLastScoreField("ball")} width="w-20" placeholder="0" />
        <LabeledInput label="Decl." value={lastScore.decl} onChange={updateLastScoreField("decl")} width="w-20" placeholder="0" />
        <div className="self-end ml-1">
          <SubmitButton small onClick={() => onAction?.("updateLastScore", lastScore)} />
        </div>
      </Row>

      {/* 1st Inn Score - Row 1 */}
      <Row label="1st Inn" striped>
        <LabeledInput label="Score" value={firstInnScore1} onChange={setFirstInnScore1} width="w-32" placeholder="Enter score" />
        <div className="self-end">
          <SubmitButton small onClick={() => onAction?.("firstInnScore1", { score: firstInnScore1 })} />
        </div>
      </Row>

      {/* 1st Inn Score - Row 2 */}
      <Row label="1st Inn">
        <LabeledInput label="Score" value={firstInnScore2} onChange={setFirstInnScore2} width="w-32" placeholder="Enter score" />
        <div className="self-end">
          <SubmitButton small onClick={() => onAction?.("firstInnScore2", { score: firstInnScore2 })} />
        </div>
      </Row>

      {/* Trail Run */}
      <Row label="Trail Run" striped>
        <TextInput value={trailRun} onChange={setTrailRun} width="w-32" placeholder="0" />
        <SubmitButton small onClick={() => onAction?.("trailRun", { value: trailRun })} />
      </Row>

      {/* Lead Run */}
      <Row label="Lead Run" borderBottom={false}>
        <TextInput value={leadRun} onChange={setLeadRun} width="w-32" placeholder="0" />
        <SubmitButton small onClick={() => onAction?.("leadRun", { value: leadRun })} />
      </Row>
    </div>
  );
}