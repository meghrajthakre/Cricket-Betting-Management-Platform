const VARIANTS = {
  ocean: ["#1E3A5F", "#4B75B8", "#90B4D4"],
  neon: ["#FFFFFF", "#D6E4F5", "#90B4D4"],
  light: ["#4B75B8", "#90B4D4", "#D6E4F5"],
};

export default function Spinner({
  size = 20,
  className = "",
  variant = "ocean",
  label = "Loading",
}) {
  const colors = VARIANTS[variant] || VARIANTS.ocean;
  const dotSize = Math.max(4, Math.round(size * 0.28));
  const gap = Math.max(2, Math.round(size * 0.13));
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ height: size, gap }}
      role="status"
      aria-label={label}
    >
      {colors.map((color, index) => (
        <span
          key={color}
          className="animate-bounce rounded-full"
          style={{
            width: dotSize,
            height: dotSize,
            backgroundColor: color,
            boxShadow: `0 0 ${Math.max(4, Math.round(size * 0.25))}px ${color}66`,
            animationDuration: "850ms",
            animationDelay: `${index * 130}ms`,
          }}
          aria-hidden="true"
        />
      ))}
      <span className="sr-only">{label}</span>
    </span>
  );
}
