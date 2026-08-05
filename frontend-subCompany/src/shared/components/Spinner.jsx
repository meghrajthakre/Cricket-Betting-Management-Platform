export default function Spinner({ size = 20, label = "" }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="inline-block animate-spin rounded-full border-2 border-current border-t-transparent"
        style={{ width: size, height: size }}
      />
      {label && <span>{label}</span>}
    </span>
  );
}
