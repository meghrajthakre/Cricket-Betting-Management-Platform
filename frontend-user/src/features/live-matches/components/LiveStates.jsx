import { IoTrophyOutline } from "react-icons/io5";

export function ErrorState({ message }) {
  return (
    <div style={{ padding: "16px", borderRadius: "12px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", fontSize: "13px", color: "#dc2626", fontFamily: "var(--font-nunito)" }}>
      <strong>Error:</strong> {message}<br />
      <span style={{ fontSize: "11px", opacity: 0.7 }}>Please check your connection and try again later.</span>
    </div>
  );
}

export function EmptyState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 24px", gap: "12px", textAlign: "center" }}>
      <div style={{ width: "60px", height: "60px", borderRadius: "50%", backgroundColor: "var(--color-input-bg)", border: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <IoTrophyOutline size={26} style={{ color: "var(--color-accent)", opacity: 0.5 }} />
      </div>
      <p style={{ margin: 0, fontFamily: "var(--font-rajdhani)", fontWeight: "700", fontSize: "15px", letterSpacing: "0.3px", color: "var(--color-text-dark)", opacity: 0.4 }}>No matches today</p>
      <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-dark)", opacity: 0.3 }}>Today&apos;s matches added by the superadmin will appear here.</p>
    </div>
  );
}
