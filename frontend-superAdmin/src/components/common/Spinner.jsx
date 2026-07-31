const VARIANTS = {
  rainbow: ["#3b82f6", "#10b981"],
  sunset: ["#f97316", "#eab308"],
  ocean: ["#4c89a8", "#356f8d"],
  neon: ["#10b981", "#06b6d4"],
};

export default function Spinner({
  size = 20,
  className = "",
  variant = "rainbow",
  label = "Loading",
}) {
  const [primary, secondary] = VARIANTS[variant] || VARIANTS.rainbow;
  const innerInset = Math.max(3, Math.round(size * 0.16));
  const borderWidth = Math.max(2, Math.round(size * 0.08));

  return (
    <span
      className={`inline-flex items-center justify-center ${className}`}
      role="status"
      aria-label={label}
    >
      <span
        className="relative block shrink-0"
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        <span
          className="absolute inset-0 animate-spin rounded-full border-solid"
          style={{
            borderWidth,
            borderColor: `${primary}26`,
            borderTopColor: primary,
            animationDuration: "800ms",
          }}
        />
        <span
          className="absolute animate-spin rounded-full border-solid"
          style={{
            inset: innerInset,
            borderWidth,
            borderColor: `${secondary}26`,
            borderBottomColor: secondary,
            animationDirection: "reverse",
            animationDuration: "650ms",
          }}
        />
      </span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
