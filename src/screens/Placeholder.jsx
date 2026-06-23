import { Card, Icon } from "../ui/kit.jsx";

/* Stub for screens not yet built. The app is implemented screen by screen;
   these light up in later steps (Evaluate → Lineup → Journey → Board). */
export default function Placeholder({ title, icon, step }) {
  return (
    <Card style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, minHeight: 320, textAlign: "center" }}>
      <div style={{ width: 64, height: 64, borderRadius: 18, background: "var(--brand-tint)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={30} color="var(--brand)" stroke={1.8} />
      </div>
      <div>
        <h2 style={{ margin: "0 0 6px", fontFamily: "Sora", fontSize: 20, fontWeight: 800, color: "var(--ink)" }}>{title}</h2>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 14, fontWeight: 600, maxWidth: 360 }}>
          {step} — coming in a later step. We're building Hoopin one screen at a time.
        </p>
      </div>
    </Card>
  );
}
