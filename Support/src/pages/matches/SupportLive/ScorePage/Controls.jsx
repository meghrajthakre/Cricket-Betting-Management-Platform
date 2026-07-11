import React, { useState } from "react";

/* ------------------------------------------------------------------ */
/*  Controls                                                           */
/*  - Table-style control panel for manual match updates               */
/*  - Matches: First Inn Bat / Second Inn Bat / Complete 2nd Inn /      */
/*    Update Last Score / 1st Inn Score / 1st Inn Score /               */
/*    Trail Run / Lead Run                                             */
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

function SubmitButton({ onClick, small = false, label = "Submit", isLoading = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      className={`bg-[#4a80a0] hover:bg-[#3d6c88] active:bg-[#345a73] text-white font-semibold ${
        small ? "text-xs px-4 py-1.5" : "text-sm px-6 py-2"
      } rounded cursor-pointer transition-colors whitespace-nowrap shadow-sm ${
        isLoading ? "opacity-70 cursor-not-allowed" : ""
      }`}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {label}
        </span>
      ) : (
        label
      )}
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

  const [loadingStates, setLoadingStates] = useState({
    firstInnBat: false,
    secondInnBat: false,
    completeSecondInn: false,
    updateLastScore: false,
    firstInnScore1: false,
    firstInnScore2: false,
    trailRun: false,
    leadRun: false,
  });

  const updateLastScoreField = (field) => (val) =>
    setLastScore((prev) => ({ ...prev, [field]: val }));

  const handleAction = async (action, data, loadingKey) => {
    // Set loading state for this specific button
    setLoadingStates(prev => ({ ...prev, [loadingKey]: true }));

    try {
      // Call the action
      await onAction?.(action, data);
    } finally {
      // Reset loading state
      setLoadingStates(prev => ({ ...prev, [loadingKey]: false }));
    }

    // Reset only input fields that should be cleared (not the team selections)
    setLastScore({
      run: "",
      wicket: "",
      over: "",
      ball: "",
      decl: "",
    });
    setFirstInnScore1("");
    setFirstInnScore2("");
    setTrailRun("0");
    setLeadRun("0");
  };

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
        <SubmitButton 
          onClick={() => handleAction("firstInnBat", { team: firstInnBat }, "firstInnBat")} 
          isLoading={loadingStates.firstInnBat}
        />
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
        <SubmitButton 
          onClick={() => handleAction("secondInnBat", { team: secondInnBat }, "secondInnBat")} 
          isLoading={loadingStates.secondInnBat}
        />
      </Row>

      {/* Complete 2nd Inn — freezes the live score into secondInningsScore */}
      <Row label="Complete 2nd Inn">
        <span className="text-xs text-[#5a6b85]">
          Freezes the current score as the final 2nd innings total.
        </span>
        <SubmitButton
          small
          label="End Innings"
          onClick={() => handleAction("completeSecondInn", {}, "completeSecondInn")}
          isLoading={loadingStates.completeSecondInn}
        />
      </Row>

      {/* Update Last Score */}
      <Row label="Update Last Score" striped>
        <LabeledInput label="Run" value={lastScore.run} onChange={updateLastScoreField("run")} width="w-20" placeholder="0" />
        <LabeledInput label="Wicket" value={lastScore.wicket} onChange={updateLastScoreField("wicket")} width="w-20" placeholder="0" />
        <LabeledInput label="Over" value={lastScore.over} onChange={updateLastScoreField("over")} width="w-20" placeholder="0" />
        <LabeledInput label="Ball" value={lastScore.ball} onChange={updateLastScoreField("ball")} width="w-20" placeholder="0" />
        <LabeledInput label="Decl." value={lastScore.decl} onChange={updateLastScoreField("decl")} width="w-20" placeholder="0" />
        <div className="self-end ml-1">
          <SubmitButton 
            small 
            onClick={() => handleAction("updateLastScore", lastScore, "updateLastScore")} 
            isLoading={loadingStates.updateLastScore}
          />
        </div>
      </Row>

      {/* 1st Inn Score - Row 1 */}
      <Row label="1st Inn">
        <LabeledInput label="Score" value={firstInnScore1} onChange={setFirstInnScore1} width="w-32" placeholder="Enter score" />
        <div className="self-end">
          <SubmitButton 
            small 
            onClick={() => handleAction("firstInnScore1", { score: firstInnScore1 }, "firstInnScore1")} 
            isLoading={loadingStates.firstInnScore1}
          />
        </div>
      </Row>

      {/* 1st Inn Score - Row 2 */}
      <Row label="1st Inn" striped>
        <LabeledInput label="Score" value={firstInnScore2} onChange={setFirstInnScore2} width="w-32" placeholder="Enter score" />
        <div className="self-end">
          <SubmitButton 
            small 
            onClick={() => handleAction("firstInnScore2", { score: firstInnScore2 }, "firstInnScore2")} 
            isLoading={loadingStates.firstInnScore2}
          />
        </div>
      </Row>

      {/* Trail Run */}
      <Row label="Trail Run">
        <TextInput value={trailRun} onChange={setTrailRun} width="w-32" placeholder="0" />
        <SubmitButton 
          small 
          onClick={() => handleAction("trailRun", { value: trailRun }, "trailRun")} 
          isLoading={loadingStates.trailRun}
        />
      </Row>

      {/* Lead Run */}
      <Row label="Lead Run" borderBottom={false} striped>
        <TextInput value={leadRun} onChange={setLeadRun} width="w-32" placeholder="0" />
        <SubmitButton 
          small 
          onClick={() => handleAction("leadRun", { value: leadRun }, "leadRun")} 
          isLoading={loadingStates.leadRun}
        />
      </Row>
    </div>
  );
}