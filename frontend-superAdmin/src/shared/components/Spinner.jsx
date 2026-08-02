const VARIANTS = {
  ocean: { track: "#90B4D4", arc: "#1E3A5F", dot: "#4B75B8" },
  neon: { track: "#D6E4F5", arc: "#FFFFFF", dot: "#90B4D4" },
  light: { track: "#D6E4F5", arc: "#4B75B8", dot: "#1E3A5F" },
};

export default function Spinner({
  size = 20,
  className = "",
  variant = "ocean",
  label = "Loading",
}) {
  const colors = VARIANTS[variant] || VARIANTS.ocean;
  const strokeWidth = size < 20 ? 3 : 2.5;

  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center ${className}`}
      style={{ width: size, height: size }}
      role="status"
      aria-label={label}
    >
      <svg
        className="absolute inset-0 animate-spin"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        style={{ animationDuration: "720ms" }}
      >
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke={colors.track}
          strokeOpacity="0.24"
          strokeWidth={strokeWidth}
        />
        <path
          d="M12 3a9 9 0 0 1 8.45 5.92"
          stroke={colors.arc}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </svg>

      <span
        className="block rounded-full"
        style={{
          width: Math.max(3, Math.round(size * 0.18)),
          height: Math.max(3, Math.round(size * 0.18)),
          backgroundColor: colors.dot,
          boxShadow: `0 0 ${Math.max(5, Math.round(size * 0.3))}px ${colors.dot}`,
        }}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
