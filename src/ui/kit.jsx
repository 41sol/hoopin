/* ============================================================
   UI KIT — icons + shared components, ported from the prototype.
   Visual styling (colors, radii, spacing, typography) is unchanged.
   ============================================================ */

const ICON = {
  squad: "M16 3.13a4 4 0 0 1 0 7.75M21 21v-2a4 4 0 0 0-3-3.87M7 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2",
  eval: "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 14l2 2 4-4",
  lineup: "M4 4h16v16H4zM4 12h16M9 4v4M15 4v4M9 16v4M15 16v4",
  journey: "M3 3v18h18M7 14l4-4 3 3 5-6",
  board: "M3 11l16-6v14L3 13v-2zM3 11v2M8 12.5V18a2 2 0 0 0 4 0",
  star: "M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.8 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z",
  flame: "M12 3c1 3 4 4 4 8a4 4 0 0 1-8 0c0-1 .5-2 1-2.5C9 11 10 9 12 3z",
  calendar: "M8 2v4M16 2v4M3 9h18M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  download: "M12 3v12M7 10l5 5 5-5M5 21h14",
  up: "M12 19V5M5 12l7-7 7 7",
  trophy: "M7 4h10v4a5 5 0 0 1-10 0zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 0-3 3M9 18h6M10 14v4M14 14v4",
  pin: "M9 4h6l-1 7 3 3v2H7v-2l3-3z M12 16v4",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3",
  chevD: "M6 9l6 6 6-6",
  check: "M5 13l4 4L19 7",
  x: "M6 6l12 12M18 6L6 18",
  chevL: "M15 18l-6-6 6-6",
  chevR: "M9 6l6 6-6 6",
  plus: "M12 5v14M5 12h14",
  edit: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z",
  football: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 8l3.5 2.5-1.3 4.1h-4.4L8.5 10.5z",
  clock: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
  bell: "M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3",
  whistle: "M3 12a5 5 0 0 0 5 5h3l6 3v-9a4 4 0 0 0-4-4H8a5 5 0 0 0-5 5zM18 9V6M16 5l2-2",
  filter: "M3 5h18M6 12h12M10 19h4",
};

export function Icon({ name, size = 22, stroke = 2, fill = "none", color = "currentColor", style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill === "current" ? color : "none"}
      stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, ...style }}>
      <path d={ICON[name] || ""} />
    </svg>
  );
}

const AV_COLORS = [
  ["#16A35A", "#0B6E45"], ["#FF6B2C", "#C2410C"], ["#2563EB", "#1E40AF"],
  ["#7C3AED", "#5B21B6"], ["#0891B2", "#155E75"], ["#DB2777", "#9D174D"],
  ["#CA8A04", "#854D0E"], ["#DC2626", "#991B1B"],
];
function initials(name) {
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}
export function Avatar({ name, size = 44, num, ring }) {
  const idx = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % AV_COLORS.length;
  const [c1, c2] = AV_COLORS[idx];
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.32, flexShrink: 0,
      background: `linear-gradient(145deg, ${c1}, ${c2})`, color: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: size * 0.38,
      position: "relative", boxShadow: ring ? `0 0 0 3px ${ring}` : "none",
      letterSpacing: "-0.02em",
    }}>
      {initials(name)}
      {num != null && (
        <span style={{
          position: "absolute", bottom: -4, insetInlineEnd: -4, minWidth: 18, height: 18, padding: "0 4px",
          borderRadius: 9, background: "var(--ink)", color: "var(--card)", fontSize: 10.5,
          fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
          border: "2px solid var(--card)", fontFamily: "Sora, sans-serif",
        }}>{num}</span>
      )}
    </div>
  );
}

export const AVAIL = {
  in:    { color: "#16A35A", bg: "rgba(22,163,90,.12)" },
  maybe: { color: "#CA8A04", bg: "rgba(202,138,4,.14)" },
  out:   { color: "#DC2626", bg: "rgba(220,38,38,.12)" },
};
export function AvailDot({ state, size = 9 }) {
  return <span style={{ width: size, height: size, borderRadius: "50%", background: AVAIL[state].color, flexShrink: 0, boxShadow: `0 0 0 3px ${AVAIL[state].bg}` }} />;
}

export function ratingColor(v) {
  if (v >= 85) return "var(--brand)";
  if (v >= 70) return "#16A35A";
  if (v >= 55) return "#CA8A04";
  return "#DC2626";
}

// Overall = average of the (0–100) sub-skill ratings.
export function overall(skills) {
  const v = Object.values(skills);
  if (!v.length) return 0;
  return Math.round(v.reduce((a, b) => a + b, 0) / v.length);
}

export function SkillBar({ label, value }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>{label}</span>
        <span style={{ fontFamily: "Sora", fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>{value}</span>
      </div>
      <div style={{ height: 8, borderRadius: 8, background: "var(--track)", overflow: "hidden" }}>
        <div style={{ width: value + "%", height: "100%", borderRadius: 8, background: ratingColor(value), transition: "width .5s cubic-bezier(.2,.8,.2,1)" }} />
      </div>
    </div>
  );
}

export function SkillChip({ label, value }) {
  const c = ratingColor(value);
  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 2, padding: "10px 12px", borderRadius: 14,
      background: "var(--track)", border: "1px solid var(--line)", minWidth: 0,
    }}>
      <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ fontFamily: "Sora", fontSize: 22, fontWeight: 800, color: c, lineHeight: 1 }}>{value}</span>
        <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600 }}>/100</span>
      </div>
    </div>
  );
}

export function Pill({ children, color = "muted", solid }) {
  const map = {
    brand: ["var(--brand)", "var(--brand-tint)"],
    accent: ["#FF6B2C", "rgba(255,107,44,.13)"],
    blue: ["#2563EB", "rgba(37,99,235,.12)"],
    green: ["#16A35A", "rgba(22,163,90,.12)"],
    muted: ["var(--muted)", "var(--track)"],
  };
  const [fg, bg] = map[color] || map.muted;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 999,
      fontSize: 11.5, fontWeight: 700, letterSpacing: ".01em",
      color: solid ? "#fff" : fg, background: solid ? fg : bg, whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

export function Card({ children, style, pad = 16, ...rest }) {
  return (
    <div {...rest} style={{
      background: "var(--card)", borderRadius: 20, padding: pad,
      border: "1px solid var(--line)", boxShadow: "var(--shadow)", ...style,
    }}>{children}</div>
  );
}

export function SectionLabel({ children, action }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
      <h3 style={{ margin: 0, fontSize: 12.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--muted)" }}>{children}</h3>
      {action}
    </div>
  );
}

/* Interactive star rating (1..max). Click the current value again to clear. */
export function StarRating({ value, onChange, max = 5, size = 34 }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {Array.from({ length: max }).map((_, i) => {
        const active = i < value;
        return (
          <button key={i} onClick={() => onChange(i + 1 === value ? 0 : i + 1)} aria-label={`${i + 1} stars`}
            style={{ border: "none", background: "none", padding: 2, cursor: "pointer", lineHeight: 0 }}>
            <Icon name="star" size={size} stroke={1.6} fill={active ? "current" : "none"}
              color={active ? "var(--brand)" : "var(--line-strong)"} />
          </button>
        );
      })}
    </div>
  );
}

/* Read-only star display with fractional fill (e.g. 4.3 → 4 full + 30% of the
   5th). Mirrors StarRating's look; used for accumulated/average ratings. */
export function FractionalStars({ value, max = 5, size = 22, gap = 6 }) {
  return (
    <div style={{ display: "inline-flex", gap }}>
      {Array.from({ length: max }).map((_, i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        const gid = `fs-${i}-${Math.round(fill * 100)}`;
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
            <defs>
              <linearGradient id={gid}>
                <stop offset={fill} stopColor="var(--brand)" />
                <stop offset={fill} stopColor="var(--line-strong)" stopOpacity="0.35" />
              </linearGradient>
            </defs>
            <path d={ICON.star} fill={`url(#${gid})`} stroke="var(--brand)" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        );
      })}
    </div>
  );
}

/* Segmented control. options: [{ value, label }] */
export function Segmented({ options, value, onChange, size = "md" }) {
  return (
    <div style={{ display: "inline-flex", background: "var(--track)", borderRadius: 12, padding: 3, gap: 2, border: "1px solid var(--line)" }}>
      {options.map(o => {
        const active = o.value === value;
        return (
          <button key={o.value} onClick={() => onChange(o.value)}
            style={{
              border: "none", cursor: "pointer", borderRadius: 9,
              padding: size === "sm" ? "6px 12px" : "8px 16px",
              fontSize: size === "sm" ? 12.5 : 13.5, fontWeight: 600, fontFamily: "inherit",
              background: active ? "var(--card)" : "transparent",
              color: active ? "var(--ink)" : "var(--muted)",
              boxShadow: active ? "0 1px 3px rgba(0,0,0,.12)" : "none", transition: "all .15s",
            }}>{o.label}</button>
        );
      })}
    </div>
  );
}

export const primaryBtn = {
  border: "none", background: "var(--brand)", color: "#fff", borderRadius: 16, padding: "15px 24px",
  fontFamily: "inherit", fontSize: 15.5, fontWeight: 700, cursor: "pointer", boxShadow: "0 6px 16px var(--brand-glow)",
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
};
