import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";   // <-- added for navigation
import { MdAccessTime } from "react-icons/md";
import { IoTrophyOutline } from "react-icons/io5";
import { getSavedMatches } from "../../api/userService";

function isToday(dateStr) {
  const matchDate = new Date(dateStr);
  if (Number.isNaN(matchDate.getTime())) return false;

  const today = new Date();
  return (
    matchDate.getFullYear() === today.getFullYear() &&
    matchDate.getMonth() === today.getMonth() &&
    matchDate.getDate() === today.getDate()
  );
}

// ─── Helper: Check if date is today ───────────────────────────────────────
// ─── Helper: Parse date/time ──────────────────────────────────────────────
function parseDateTime(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return { day: "—", month: "—", time: "—" };
  return {
    day: d.getDate().toString(),
    month: d.toLocaleString("en-IN", { month: "long" }),
    time: d.toLocaleTimeString("en-IN", { 
      hour: "2-digit", 
      minute: "2-digit", 
      hour12: true 
    }).toUpperCase(),
  };
}

// ─── Extract odds from saved match structure ──────────────────────────────
function extractBestOdds(match) {
  const odds = match.odds;
  if (!odds?.bookmakers?.length) return { matchBets: "—", sessionBets: "—" };
  
  let bestOdds = [];
  odds.bookmakers.forEach(bookmaker => {
    if (bookmaker.markets && bookmaker.markets.length > 0) {
      const market = bookmaker.markets[0];
      if (market.outcomes && market.outcomes.length >= 2) {
        bestOdds.push(market.outcomes[0].price);
        bestOdds.push(market.outcomes[1].price);
      }
    }
  });
  
  if (bestOdds.length === 0) return { matchBets: "—", sessionBets: "—" };
  const maxOdds = Math.max(...bestOdds).toFixed(2);
  const minOdds = Math.min(...bestOdds).toFixed(2);
  return { matchBets: maxOdds, sessionBets: minOdds };
}

// ─── Normalize saved match for UI ─────────────────────────────────────────
function normalizeSavedMatch(m) {
  const { day, month, time } = parseDateTime(m.commenceTime);
  const { matchBets, sessionBets } = extractBestOdds(m);
  
  return {
    id: m.matchId,
    title: `${m.homeTeam} vs ${m.awayTeam}`,
    subtitle: m.sportKey || "Cricket",
    matchBets,
    sessionBets,
    day,
    month,
    time,
    venue: m.venue || "",
    status: "scheduled",
    score: null,
    raw: m,
    teams: [m.homeTeam, m.awayTeam],
  };
}

// ─── TeamBadge ─────────────────────────────────────────────────────────────
const TeamBadge = ({ name }) => {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center", flex: 1,
    }}>
      <span style={{
        fontSize: "12px", fontWeight: "700", color: "var(--color-text-dark)",
        fontFamily: "var(--font-nunito)", textAlign: "center",
        maxWidth: "120px",
      }}>
        {name || "TBA"}
      </span>
    </div>
  );
};

// ─── StatusBadge ──────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const config = {
    live:      { label: "● LIVE",    color: "#ef4444", bg: "#fef2f2" },
    completed: { label: "Completed", color: "#6b7280", bg: "#f3f4f6" },
    scheduled: { label: "Upcoming",  color: "#0d9488", bg: "#f0fdfa" },
  }[status] || { label: status, color: "#6b7280", bg: "#f3f4f6" };

  return (
    <span style={{
      fontSize: "10px", fontWeight: "700", letterSpacing: "0.5px",
      padding: "2px 7px", borderRadius: "20px",
      color: config.color, backgroundColor: config.bg,
      fontFamily: "var(--font-rajdhani)", flexShrink: 0,
    }}>
      {config.label}
    </span>
  );
};

// ─── BetPill ──────────────────────────────────────────────────────────────
const BetPill = ({ label, value }) => (
  <div style={{
    display: "inline-flex", alignItems: "center", gap: "5px",
    padding: "4px 10px", borderRadius: "6px",
    backgroundColor: "var(--color-bg-main)",
    border: "1px solid var(--color-border)", flexShrink: 0,
  }}>
    <span style={{ fontSize: "11px", color: "var(--color-text-dark)", opacity: 0.5, fontFamily: "var(--font-nunito)", whiteSpace: "nowrap" }}>
      {label}
    </span>
    <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--color-primary)", fontFamily: "var(--font-rajdhani)", lineHeight: 1 }}>
      {value}
    </span>
  </div>
);

// ─── IPLMatchCard ─────────────────────────────────────────────────────────
const IPLMatchCard = ({ match }) => {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const teamA = match.teams?.[0] || "TBA";
  const teamB = match.teams?.[1] || "TBA";
  const isLive = match.status === "live";

  const handleClick = () => {
    navigate(`/match/${match.id}`);   // navigate to detail page
  };

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        backgroundColor: "var(--color-input-bg)",
        borderRadius: "16px",
        border: `1.5px solid ${isLive ? "#ef444440" : hovered ? "var(--color-primary)" : "var(--color-border)"}`,
        overflow: "hidden", cursor: "pointer",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        transition: "border-color 0.18s, transform 0.18s",
      }}
    >
      {/* Live glow bar */}
      {isLive && (
        <div style={{
          position: "absolute", top: 0, left: 0, height: "3px", width: "100%",
          background: "linear-gradient(90deg, #ef4444, #f97316, #ef4444)",
          backgroundSize: "200% 100%",
          animation: "shimmer 2s linear infinite",
        }} />
      )}
      {/* Hover accent bar */}
      {!isLive && (
        <div style={{
          position: "absolute", top: 0, left: 0, height: "3px", width: "100%",
          backgroundColor: "var(--color-primary)",
          transformOrigin: "left",
          transform: hovered ? "scaleX(1)" : "scaleX(0)",
          transition: "transform 0.25s ease",
        }} />
      )}

      <div style={{ padding: "14px 16px" }}>
        {/* Header: subtitle + badges (SavedBadge removed) */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
          <span style={{
            fontSize: "11px", fontWeight: "600", opacity: 0.45,
            color: "var(--color-text-dark)", fontFamily: "var(--font-nunito)",
          }}>
            {match.subtitle}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <StatusBadge status={match.status} />
            <div style={{
              display: "flex", alignItems: "center", gap: "4px",
              padding: "3px 8px", borderRadius: "20px",
              backgroundColor: "var(--color-bg-main)",
              border: "1px solid var(--color-border)",
            }}>
              <MdAccessTime size={12} style={{ color: "var(--color-primary)", opacity: 0.8 }} />
              <span style={{
                fontFamily: "var(--font-rajdhani)", fontWeight: "700",
                fontSize: "11px", color: "var(--color-primary)", letterSpacing: "0.4px",
              }}>
                {match.time}
              </span>
            </div>
          </div>
        </div>

        {/* Teams row */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
          <TeamBadge name={teamA} />
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", flexShrink: 0,
          }}>
            <span style={{
              fontFamily: "var(--font-rajdhani)", fontWeight: "700",
              fontSize: "13px", color: "var(--color-text-dark)", opacity: 0.3,
            }}>VS</span>
          </div>
          <TeamBadge name={teamB} />
        </div>

        {/* Venue */}
        {match.venue && (
          <div style={{
            fontSize: "11px", color: "var(--color-text-dark)", opacity: 0.35,
            fontFamily: "var(--font-nunito)", marginBottom: "10px",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            📍 {match.venue}
          </div>
        )}

        {/* Bet pills */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <BetPill label="Match Bets" value={match.matchBets} />
          <BetPill label="Session Bets" value={match.sessionBets} />
        </div>
      </div>
    </div>
  );
};

// ─── SkeletonCard ─────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div style={{
    borderRadius: "16px", overflow: "hidden",
    backgroundColor: "var(--color-input-bg)",
    border: "1.5px solid var(--color-border)",
    animation: "pulse 1.5s ease-in-out infinite",
    padding: "14px 16px",
  }}>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px" }}>
      <div style={{ height: "12px", width: "80px", borderRadius: "6px", backgroundColor: "var(--color-border)" }} />
      <div style={{ display: "flex", gap: "6px" }}>
        <div style={{ height: "20px", width: "52px", borderRadius: "20px", backgroundColor: "var(--color-border)" }} />
        <div style={{ height: "20px", width: "64px", borderRadius: "20px", backgroundColor: "var(--color-border)" }} />
      </div>
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
        <div style={{ width: "44px", height: "44px", borderRadius: "50%", backgroundColor: "var(--color-border)" }} />
        <div style={{ height: "10px", width: "56px", borderRadius: "4px", backgroundColor: "var(--color-border)" }} />
      </div>
      <div style={{ width: "24px", height: "14px", borderRadius: "4px", backgroundColor: "var(--color-border)", flexShrink: 0 }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
        <div style={{ width: "44px", height: "44px", borderRadius: "50%", backgroundColor: "var(--color-border)" }} />
        <div style={{ height: "10px", width: "56px", borderRadius: "4px", backgroundColor: "var(--color-border)" }} />
      </div>
    </div>
    <div style={{ display: "flex", gap: "8px" }}>
      <div style={{ height: "28px", width: "100px", borderRadius: "6px", backgroundColor: "var(--color-border)" }} />
      <div style={{ height: "28px", width: "100px", borderRadius: "6px", backgroundColor: "var(--color-border)" }} />
    </div>
  </div>
);

// ─── Main Live Component ──────────────────────────────────────────────────
const Live = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);

  const fetchSavedMatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getSavedMatches();
      const savedMatches = response.data || response;
      
      if (!Array.isArray(savedMatches)) {
        throw new Error("Unexpected response format.");
      }

      // The Live Matches page intentionally shows only today's saved matches.
      const normalizedMatches = savedMatches
        .filter((match) => isToday(match.commenceTime))
        .map(normalizeSavedMatch);
      normalizedMatches.sort((a, b) => 
        new Date(a.raw.commenceTime) - new Date(b.raw.commenceTime)
      );

      setMatches(normalizedMatches);
      setLastFetched(new Date());
    } catch (err) {
      console.error("Error fetching saved matches:", err);
      setError(err.message || "Failed to load matches");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSavedMatches();
    const interval = setInterval(fetchSavedMatches, 60000);
    return () => clearInterval(interval);
  }, []);

  const groupByDate = (matchesList) => {
    const groups = {};
    matchesList.forEach((m) => {
      const key = `${m.day} ${m.month}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    });
    return groups;
  };

  const grouped = groupByDate(matches);
  return (
    <div style={{ 
      minHeight: "100vh", 
      backgroundColor: "var(--color-bg-main)", 
      fontFamily: "var(--font-nunito)" 
    }}>
      <div style={{
        padding: "16px 12px",
        maxWidth: "640px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}>
        {/* Header with last updated time */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ 
            fontSize: "11px", 
            color: "var(--color-text-dark)", 
            opacity: 0.35, 
            fontFamily: "var(--font-nunito)" 
          }}>
            {lastFetched
              ? `Updated ${lastFetched.toLocaleTimeString("en-IN", { 
                  hour: "2-digit", 
                  minute: "2-digit" 
                })}`
              : "Fetching..."}
          </span>
        </div>

        {/* Loading skeleton */}
        {loading && !matches.length && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div style={{
            padding: "16px",
            borderRadius: "12px",
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            fontSize: "13px",
            color: "#dc2626",
            fontFamily: "var(--font-nunito)",
          }}>
            <strong>Error:</strong> {error}
            <br />
            <span style={{ fontSize: "11px", opacity: 0.7 }}>
              Please check your connection and try again later.
            </span>
          </div>
        )}

        {/* Empty state - no matches today */}
        {!loading && !error && matches.length === 0 && (
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "64px 24px",
            gap: "12px",
            textAlign: "center",
          }}>
            <div style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              backgroundColor: "var(--color-input-bg)",
              border: "1px solid var(--color-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <IoTrophyOutline size={26} style={{ color: "var(--color-accent)", opacity: 0.5 }} />
            </div>
            <p style={{ 
              margin: 0, 
              fontFamily: "var(--font-rajdhani)", 
              fontWeight: "700", 
              fontSize: "15px", 
              letterSpacing: "0.3px", 
              color: "var(--color-text-dark)", 
              opacity: 0.4 
            }}>
              No matches today
            </p>
            <p style={{ 
              margin: 0, 
              fontSize: "12px", 
              color: "var(--color-text-dark)", 
              opacity: 0.3 
            }}>
              Today&apos;s matches added by the superadmin will appear here.
            </p>
          </div>
        )}

        {/* Match groups */}
        {!loading && !error && Object.entries(grouped).map(([dateLabel, groupMatches]) => (
          <div key={dateLabel} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{
                fontFamily: "var(--font-rajdhani)",
                fontWeight: "700",
                fontSize: "11px",
                letterSpacing: "1px",
                textTransform: "uppercase",
                color: "var(--color-primary)",
                whiteSpace: "nowrap",
              }}>
                {dateLabel}
              </span>
              <span style={{ flex: 1, height: "1px", backgroundColor: "var(--color-border)" }} />
            </div>
            {groupMatches.map((match) => (
              <IPLMatchCard key={match.id} match={match} />
            ))}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.3; }
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
};

export default Live;
