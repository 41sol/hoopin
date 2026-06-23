/* Centered loading / empty / error message used across screens. */
export default function StateNote({ children, tone = "muted" }) {
  const color = tone === "error" ? "#DC2626" : "var(--muted)";
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: 240, padding: 24, textAlign: "center",
      color, fontSize: 14.5, fontWeight: 600,
    }}>
      {children}
    </div>
  );
}
