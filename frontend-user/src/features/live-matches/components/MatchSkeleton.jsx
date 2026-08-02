export default function MatchSkeleton() {
  const block = (height, width, radius = "6px") => ({ height, width, borderRadius: radius, backgroundColor: "var(--color-border)" });
  return (
    <div style={{ borderRadius: "16px", overflow: "hidden", backgroundColor: "var(--color-input-bg)", border: "1.5px solid var(--color-border)", animation: "pulse 1.5s ease-in-out infinite", padding: "14px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px" }}><div style={block("12px", "80px")} /><div style={{ display: "flex", gap: "6px" }}><div style={block("20px", "52px", "20px")} /><div style={block("20px", "64px", "20px")} /></div></div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}><div style={{ flex: 1, display: "flex", justifyContent: "center" }}><div style={block("44px", "44px", "50%")} /></div><div style={block("14px", "24px")} /><div style={{ flex: 1, display: "flex", justifyContent: "center" }}><div style={block("44px", "44px", "50%")} /></div></div>
      <div style={{ display: "flex", gap: "8px" }}><div style={block("28px", "100px")} /><div style={block("28px", "100px")} /></div>
    </div>
  );
}
