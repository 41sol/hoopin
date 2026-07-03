import { useEffect, useMemo, useState } from "react";
import { Avatar, Card, Icon, SectionLabel, Segmented, ratingColor } from "../ui/kit.jsx";
import { RadarChart, TrendChart } from "../ui/charts.jsx";
import { t } from "../data/strings.js";
import { useSquad } from "../state/squad.jsx";
import { getPlayerTrend } from "../lib/api.js";
import StateNote from "../components/StateNote.jsx";

const firstName = (name) => name.split(" ")[0];
const heroStat = {
  display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700,
  background: "rgba(255,255,255,.18)", padding: "5px 11px", borderRadius: 999,
};

export default function JourneyScreen() {
  const { players, loading, error } = useSquad();
  const [pid, setPid] = useState(null);

  // Default to the first player once the squad loads.
  useEffect(() => { if (!pid && players.length) setPid(players[0].id); }, [players, pid]);

  if (loading || (!players.length && !error)) return <StateNote>Loading…</StateNote>;
  if (error) return <StateNote tone="error">Couldn't load the squad: {error}</StateNote>;
  const player = players.find(p => p.id === pid) || players[0];

  return (
    <div>
      {/* Player switcher */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "2px 2px 14px" }}>
        {players.map(p => {
          const on = p.id === player.id;
          return (
            <button key={p.id} onClick={() => setPid(p.id)} aria-pressed={on} style={{
              display: "flex", alignItems: "center", gap: 8,
              border: "1px solid " + (on ? "var(--brand)" : "var(--line)"),
              background: on ? "var(--brand-tint)" : "var(--card)", borderRadius: 999,
              padding: "5px 12px 5px 5px", cursor: "pointer", flexShrink: 0, fontFamily: "inherit",
            }}>
              <Avatar name={p.name} size={26} />
              <span style={{ fontSize: 12.5, fontWeight: 700, color: on ? "var(--brand)" : "var(--muted)" }}>{firstName(p.name)}</span>
            </button>
          );
        })}
      </div>

      <Journey key={player.id} player={player} />
    </div>
  );
}

function Journey({ player }) {
  const [tf, setTf] = useState("6m");
  const [trend, setTrend] = useState(null);
  const [trendErr, setTrendErr] = useState(null);

  useEffect(() => {
    setTrend(null); setTrendErr(null);
    getPlayerTrend(player.id).then(setTrend).catch(e => setTrendErr(e.message || String(e)));
  }, [player.id]);

  // Radar from current Squad sub-skills (0–100).
  const radarMetrics = player.skillList.map(s => ({ key: s.key, short: s.label.slice(0, 3).toUpperCase() }));
  const radarValues = player.skillList.map(s => s.value);

  const series = useMemo(() => {
    if (!trend) return [];
    return tf === "3m" ? trend.slice(-3) : trend.slice(-6);
  }, [trend, tf]);
  const values = series.map(s => s.value);
  const labels = series.map(s => s.label);
  const delta = values.length >= 2 ? values[values.length - 1] - values[0] : 0;
  const periodLabel = (tf === "3m" ? t.last_3m : t.last_6m).toLowerCase();

  return (
    <>
      {/* Motivational hero */}
      <Card style={{ marginBottom: 14, background: "linear-gradient(150deg, var(--brand-deep), var(--brand))", border: "none", color: "#fff", overflow: "hidden", position: "relative" }}>
        <div style={{ position: "absolute", insetInlineEnd: -20, top: -20, opacity: .14 }}><Icon name="trophy" size={130} stroke={1.2} /></div>
        <div style={{ position: "relative" }}>
          <div style={{ fontSize: 13, fontWeight: 600, opacity: .9 }}>{t.keep_up}, {firstName(player.name)}! 🔥</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginTop: 6 }}>
            <span style={{ fontFamily: "Sora", fontWeight: 800, fontSize: 44, lineHeight: 1 }}>{delta >= 0 ? "+" : ""}{delta}</span>
            <span style={{ fontSize: 13, fontWeight: 600, opacity: .9, paddingBottom: 8 }}>{t.overall} {t.pts_over} {periodLabel}</span>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <span style={heroStat}><Icon name="up" size={13} stroke={2.6} /> {t.improving}</span>
            <span style={heroStat}><Icon name="calendar" size={13} /> {Math.round((player.attendance_pct ?? 0) * 100)}% {t.attendance.toLowerCase()}</span>
          </div>
        </div>
      </Card>

      {/* Radar + Trend side by side on desktop */}
      <div className="journey-grid">
        {/* Radar (current skills) */}
        <Card>
          <SectionLabel>{t.overview}</SectionLabel>
          <RadarChart metrics={radarMetrics} values={radarValues} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
            {player.skillList.map(s => (
              <div key={s.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", background: "var(--track)", borderRadius: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>{s.label}</span>
                <span style={{ fontFamily: "Sora", fontWeight: 800, fontSize: 14, color: ratingColor(s.value) }}>{s.value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Trend (overall evaluation score over time) */}
        <Card>
          <SectionLabel action={
            <Segmented size="sm" value={tf} onChange={setTf}
              options={[{ value: "3m", label: t.last_3m }, { value: "6m", label: t.last_6m }]} />
          }>{t.improving}</SectionLabel>
          {trendErr ? (
            <StateNote tone="error">Couldn't load trend: {trendErr}</StateNote>
          ) : !trend ? (
            <StateNote>Loading trend…</StateNote>
          ) : values.length >= 2 ? (
            <TrendChart values={values} labels={labels} />
          ) : (
            <div style={{ padding: "40px 16px", textAlign: "center", color: "var(--muted)", fontSize: 13.5, fontWeight: 600 }}>{t.not_enough}</div>
          )}
        </Card>
      </div>
    </>
  );
}
