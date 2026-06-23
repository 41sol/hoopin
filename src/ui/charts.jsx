/* SVG charts ported from the prototype: radar (spider) + trend (line/area).
   Both are pure presentational and theme-aware via CSS variables. */

function radarPoints(values, cx, cy, r) {
  const n = values.length;
  return values.map((v, i) => {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const rr = (v / 100) * r;
    return [cx + rr * Math.cos(ang), cy + rr * Math.sin(ang)];
  });
}

// metrics: [{ short }], data: { key: value 0..100 } keyed to match metrics order via `keys`.
export function RadarChart({ metrics, values, size = 240 }) {
  const cx = size / 2, cy = size / 2, r = size / 2 - 38;
  const n = metrics.length;
  const rings = [0.25, 0.5, 0.75, 1];
  const axisPt = (i, mul) => {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [cx + r * mul * Math.cos(ang), cy + r * mul * Math.sin(ang)];
  };
  const pts = radarPoints(values, cx, cy, r);
  const poly = pts.map(p => p.join(",")).join(" ");

  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: "100%", height: "auto", overflow: "visible" }}>
      {rings.map((ring, ri) => (
        <polygon key={ri} fill="none" stroke="var(--line)" strokeWidth="1"
          points={metrics.map((_, i) => axisPt(i, ring).join(",")).join(" ")} />
      ))}
      {metrics.map((_, i) => {
        const [x, y] = axisPt(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--line)" strokeWidth="1" />;
      })}
      <polygon points={poly} fill="var(--brand)" fillOpacity="0.18" stroke="var(--brand)" strokeWidth="2.5" strokeLinejoin="round" />
      {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="3.5" fill="var(--brand)" stroke="var(--card)" strokeWidth="2" />)}
      {metrics.map((m, i) => {
        const [x, y] = axisPt(i, 1.22);
        return (
          <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
            fontSize="11" fontWeight="700" fill="var(--muted)" fontFamily="Plus Jakarta Sans">
            {m.short}
          </text>
        );
      })}
    </svg>
  );
}

export function TrendChart({ values, labels, w = 320, h = 150 }) {
  const pad = { l: 8, r: 8, t: 14, b: 22 };
  const min = Math.min(...values) - 6, max = Math.max(...values) + 4;
  const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  const x = i => pad.l + (i / (values.length - 1)) * iw;
  const y = v => pad.t + ih - ((v - min) / (max - min || 1)) * ih;
  const line = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(v)}`).join(" ");
  const area = `${line} L${x(values.length - 1)},${pad.t + ih} L${x(0)},${pad.t + ih} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "auto" }}>
      <defs>
        <linearGradient id="hp-trend" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((g, i) => (
        <line key={i} x1={pad.l} y1={pad.t + ih * g} x2={w - pad.r} y2={pad.t + ih * g}
          stroke="var(--line)" strokeWidth="1" strokeDasharray={i === 2 ? "0" : "3 4"} />
      ))}
      <path d={area} fill="url(#hp-trend)" />
      <path d={line} fill="none" stroke="var(--brand)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {values.map((v, i) => {
        const last = i === values.length - 1;
        return (
          <g key={i}>
            <circle cx={x(i)} cy={y(v)} r={last ? 5 : 3.5} fill={last ? "var(--brand)" : "var(--card)"} stroke="var(--brand)" strokeWidth="2.5" />
            {last && <text x={x(i)} y={y(v) - 12} textAnchor="middle" fontSize="13" fontWeight="800" fill="var(--brand)" fontFamily="Sora">{v}</text>}
          </g>
        );
      })}
      {labels.map((l, i) => (
        <text key={i} x={x(i)} y={h - 6} textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--muted)" fontFamily="Plus Jakarta Sans">{l}</text>
      ))}
    </svg>
  );
}
