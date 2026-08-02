import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MdAccessTime } from "react-icons/md";

function TeamBadge({ name }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1 }}>
      <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--color-text-dark)", fontFamily: "var(--font-nunito)", textAlign: "center", maxWidth: "120px" }}>
        {name || "TBA"}
      </span>
    </div>
  );
}

function StatusBadge({ status }) {
  const config = {
    live: { label: "● LIVE", color: "#ef4444", bg: "#fef2f2" },
    completed: { label: "Completed", color: "#6b7280", bg: "#f3f4f6" },
    scheduled: { label: "Upcoming", color: "#0d9488", bg: "#f0fdfa" },
  }[status] || { label: status, color: "#6b7280", bg: "#f3f4f6" };

  return (
    <span style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "0.5px", padding: "2px 7px", borderRadius: "20px", color: config.color, backgroundColor: config.bg, fontFamily: "var(--font-rajdhani)", flexShrink: 0 }}>
      {config.label}
    </span>
  );
}

function BetPill({ label, value }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "4px 10px", borderRadius: "6px", backgroundColor: "var(--color-bg-main)", border: "1px solid var(--color-border)", flexShrink: 0 }}>
      <span style={{ fontSize: "11px", color: "var(--color-text-dark)", opacity: 0.5, fontFamily: "var(--font-nunito)", whiteSpace: "nowrap" }}>{label}</span>
      <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--color-primary)", fontFamily: "var(--font-rajdhani)", lineHeight: 1 }}>{value}</span>
    </div>
  );
}

export default function MatchCard({ match }) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const [teamA, teamB] = match.teams || [];
  const isLive = match.status === "live";

  return (
    <div
      onClick={() => navigate(`/match/${match.id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: "relative", backgroundColor: "var(--color-input-bg)", borderRadius: "16px", border: `1.5px solid ${isLive ? "#ef444440" : hovered ? "var(--color-primary)" : "var(--color-border)"}`, overflow: "hidden", cursor: "pointer", transform: hovered ? "translateY(-2px)" : "translateY(0)", transition: "border-color 0.18s, transform 0.18s" }}
    >
      {isLive ? (
        <div style={{ position: "absolute", top: 0, left: 0, height: "3px", width: "100%", background: "linear-gradient(90deg, #ef4444, #f97316, #ef4444)", backgroundSize: "200% 100%", animation: "shimmer 2s linear infinite" }} />
      ) : (
        <div style={{ position: "absolute", top: 0, left: 0, height: "3px", width: "100%", backgroundColor: "var(--color-primary)", transformOrigin: "left", transform: hovered ? "scaleX(1)" : "scaleX(0)", transition: "transform 0.25s ease" }} />
      )}

      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
          <span style={{ fontSize: "11px", fontWeight: "600", opacity: 0.45, color: "var(--color-text-dark)", fontFamily: "var(--font-nunito)" }}>{match.subtitle}</span>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <StatusBadge status={match.status} />
            <div style={{ display: "flex", alignItems: "center", gap: "4px", padding: "3px 8px", borderRadius: "20px", backgroundColor: "var(--color-bg-main)", border: "1px solid var(--color-border)" }}>
              <MdAccessTime size={12} style={{ color: "var(--color-primary)", opacity: 0.8 }} />
              <span style={{ fontFamily: "var(--font-rajdhani)", fontWeight: "700", fontSize: "11px", color: "var(--color-primary)", letterSpacing: "0.4px" }}>{match.time}</span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
          <TeamBadge name={teamA} />
          <span style={{ fontFamily: "var(--font-rajdhani)", fontWeight: "700", fontSize: "13px", color: "var(--color-text-dark)", opacity: 0.3 }}>VS</span>
          <TeamBadge name={teamB} />
        </div>

        {match.venue && <div style={{ fontSize: "11px", color: "var(--color-text-dark)", opacity: 0.35, fontFamily: "var(--font-nunito)", marginBottom: "10px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>📍 {match.venue}</div>}

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <BetPill label="Match Bets" value={match.matchBets} />
          <BetPill label="Session Bets" value={match.sessionBets} />
        </div>
      </div>
    </div>
  );
}
