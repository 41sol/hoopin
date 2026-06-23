import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Avatar, Card, Icon, Pill, Segmented, SectionLabel, AVAIL, primaryBtn } from "../ui/kit.jsx";
import { t } from "../data/strings.js";
import { useSquad } from "../state/squad.jsx";
import { getFormations, getLineups, getLineupDetail, saveLineup } from "../lib/api.js";
import StateNote from "../components/StateNote.jsx";

const today = () => new Date().toISOString().slice(0, 10);
const firstName = (name) => name.split(" ")[0];

// Greedy assignment: prefer same line + available, then same line, then any available.
function autoFill(slots, players) {
  const used = new Set();
  const assign = {};
  slots.forEach((s, i) => {
    const pick =
      players.find(p => !used.has(p.id) && p.line === s.line && p.availability !== "out") ||
      players.find(p => !used.has(p.id) && p.line === s.line) ||
      players.find(p => !used.has(p.id) && p.availability !== "out");
    if (pick) { assign[i] = pick.id; used.add(pick.id); }
  });
  return assign;
}

function Token({ player, big }) {
  const ac = AVAIL[player.availability].color;
  const sz = big ? 52 : 44;
  return (
    <div style={{
      width: sz, height: sz, borderRadius: 15, background: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "Sora", fontWeight: 800, fontSize: sz * 0.4, color: "var(--brand-deep)",
      boxShadow: `0 3px 8px rgba(0,0,0,.3), 0 0 0 3px ${ac}`,
    }}>{player.number}</div>
  );
}

function PitchMarkings() {
  const line = "rgba(255,255,255,.35)";
  return (
    <svg viewBox="0 0 300 400" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
      {[0, 1, 2, 3, 4, 5].map(i => (
        <rect key={i} x="0" y={i * 66.6} width="300" height="33.3" fill={i % 2 ? "rgba(255,255,255,.04)" : "transparent"} />
      ))}
      <g stroke={line} strokeWidth="2" fill="none">
        <rect x="4" y="4" width="292" height="392" rx="4" />
        <line x1="4" y1="200" x2="296" y2="200" />
        <circle cx="150" cy="200" r="42" />
        <circle cx="150" cy="200" r="2.5" fill={line} stroke="none" />
        <rect x="90" y="4" width="120" height="56" />
        <rect x="120" y="4" width="60" height="24" />
        <rect x="90" y="340" width="120" height="56" />
        <rect x="120" y="372" width="60" height="24" />
      </g>
    </svg>
  );
}

const tokenName = {
  fontSize: 10.5, fontWeight: 700, color: "#fff", background: "rgba(0,0,0,.35)", padding: "1px 7px",
  borderRadius: 999, whiteSpace: "nowrap", maxWidth: 70, overflow: "hidden", textOverflow: "ellipsis",
};
const ctxInput = {
  width: "100%", boxSizing: "border-box", border: "1px solid var(--line)", borderRadius: 12,
  padding: "11px 12px", fontFamily: "inherit", fontSize: 14, color: "var(--ink)", background: "var(--card)", outline: "none",
};

export default function LineupScreen() {
  const { players, team, loading, error } = useSquad();
  const [formations, setFormations] = useState(null);
  const [loadErr, setLoadErr] = useState(null);

  useEffect(() => {
    getFormations().then(setFormations).catch(e => setLoadErr(e.message || String(e)));
  }, []);

  if (loading || !formations) return <StateNote>Loading lineup builder…</StateNote>;
  if (error) return <StateNote tone="error">Couldn't load the squad: {error}</StateNote>;
  if (loadErr) return <StateNote tone="error">Couldn't load formations: {loadErr}</StateNote>;
  if (!formations.length) return <StateNote tone="error">No formations configured.</StateNote>;

  return <Builder players={players} team={team} formations={formations} />;
}

function Builder({ players, team, formations }) {
  const byId = id => players.find(p => p.id === id);

  const [formationId, setFormationId] = useState(formations[0].id);
  const [assign, setAssign] = useState(() => autoFill(formations[0].slots, players));
  const [drag, setDrag] = useState(null); // { pid, x, y, from }
  const [matchDate, setMatchDate] = useState(today());
  const [opponent, setOpponent] = useState("");
  const [currentId, setCurrentId] = useState(null);
  const [lineups, setLineups] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const pitchRef = useRef(null);
  const dragRef = useRef(null);
  dragRef.current = drag;

  const formation = useMemo(() => formations.find(f => f.id === formationId) || formations[0], [formations, formationId]);
  const slots = formation.slots;

  const refreshLineups = () => { if (team?.id) getLineups(team.id).then(setLineups).catch(() => {}); };
  useEffect(() => { refreshLineups(); /* eslint-disable-next-line */ }, [team?.id]);

  const assignedIds = new Set(Object.values(assign));
  const roster = players.filter(p => !assignedIds.has(p.id));
  const onCount = Object.values(assign).filter(id => byId(id)?.availability === "in").length;
  const unavailableStarters = Object.values(assign).map(byId).filter(p => p && p.availability === "out");

  const changeFormation = (id) => {
    const f = formations.find(x => x.id === id);
    setFormationId(id);
    setAssign(autoFill(f.slots, players));
  };

  const newLineup = () => {
    setCurrentId(null);
    setMatchDate(today());
    setOpponent("");
    setFormationId(formations[0].id);
    setAssign(autoFill(formations[0].slots, players));
  };

  const loadExisting = async (id) => {
    try {
      const d = await getLineupDetail(id);
      setCurrentId(d.id);
      setFormationId(d.formation.id);
      setMatchDate(d.match_date || today());
      setOpponent(d.opponent || "");
      setAssign(d.assign);
    } catch (e) {
      alert("Couldn't load lineup: " + (e.message || e));
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const id = await saveLineup({
        id: currentId, teamId: team.id, formationId, matchDate, opponent, assign,
      });
      setCurrentId(id);
      refreshLineups();
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (e) {
      alert("Couldn't save lineup: " + (e.message || e));
    } finally {
      setSaving(false);
    }
  };

  // ----- drag & drop (pointer events: mouse + touch) -----
  const startDrag = (e, pid, from) => {
    e.preventDefault();
    setDrag({ pid, x: e.clientX, y: e.clientY, from });
  };

  useEffect(() => {
    if (!drag) return;
    const move = (e) => setDrag(d => (d ? { ...d, x: e.clientX, y: e.clientY } : d));
    const up = (e) => {
      const d = dragRef.current;
      if (!d) { return; }
      const rect = pitchRef.current.getBoundingClientRect();
      const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
      if (inside) {
        let best = -1, bestDist = Infinity;
        slots.forEach((s, i) => {
          const sx = rect.left + (s.x / 100) * rect.width;
          const sy = rect.top + (s.y / 100) * rect.height;
          const dist = Math.hypot(sx - e.clientX, sy - e.clientY);
          if (dist < bestDist) { bestDist = dist; best = i; }
        });
        setAssign(a => {
          const na = { ...a };
          if (d.from != null) delete na[d.from];
          else Object.keys(na).forEach(k => { if (na[k] === d.pid) delete na[k]; });
          const occupant = na[best];
          if (occupant && d.from != null) na[d.from] = occupant;
          na[best] = d.pid;
          return na;
        });
      } else if (d.from != null) {
        setAssign(a => { const na = { ...a }; delete na[d.from]; return na; });
      }
      setDrag(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, [drag ? true : false, formationId]);

  return (
    <div style={{ userSelect: "none" }}>
      {/* Match context toolbar */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, flex: "1 1 150px" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>{t.load_lineup}</span>
            <select value={currentId || ""} onChange={e => (e.target.value ? loadExisting(e.target.value) : newLineup())} style={ctxInput}>
              <option value="">{t.new_lineup}</option>
              {lineups.map(l => (
                <option key={l.id} value={l.id}>
                  {(l.match_date || "No date")}{l.opponent ? ` · vs ${l.opponent}` : ""} ({l.formation?.name})
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, flex: "1 1 140px" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>{t.match_date}</span>
            <input type="date" value={matchDate} onChange={e => setMatchDate(e.target.value)} style={ctxInput} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, flex: "1 1 160px" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>{t.opponent}</span>
            <input value={opponent} onChange={e => setOpponent(e.target.value)} placeholder={t.opponent_ph} style={ctxInput} />
          </label>
        </div>
      </Card>

      {/* Formation + on-pitch count */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <Segmented size="sm" value={formationId} onChange={changeFormation}
          options={formations.map(f => ({ value: f.id, label: f.name }))} />
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 700, color: "var(--muted)" }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#16A35A" }} />{onCount} {t.available_lc}
        </span>
      </div>

      {/* Warn-but-allow: unavailable players on the pitch */}
      {unavailableStarters.length > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8, marginBottom: 12, padding: "10px 12px",
          background: "rgba(220,38,38,.08)", border: "1px solid rgba(220,38,38,.25)", borderRadius: 12,
          color: "#B91C1C", fontSize: 12.5, fontWeight: 600,
        }}>
          <Icon name="x" size={15} color="#DC2626" stroke={2.6} />
          {unavailableStarters.length} {unavailableStarters.length === 1 ? "player" : "players"} {t.unavailable_warning}: {unavailableStarters.map(p => firstName(p.name)).join(", ")}
        </div>
      )}

      <div className="lineup-grid">
        {/* Pitch */}
        <div ref={pitchRef} style={{
          position: "relative", width: "100%", aspectRatio: "3/4", borderRadius: 20, overflow: "hidden",
          background: "linear-gradient(160deg, #1d9c5e, #14823f)", boxShadow: "var(--shadow)", touchAction: "none",
        }}>
          <PitchMarkings />
          {slots.map((s, i) => {
            const pid = assign[i];
            const p = pid ? byId(pid) : null;
            const isDragging = drag && drag.from === i;
            return (
              <div key={i} style={{
                position: "absolute", left: s.x + "%", top: s.y + "%", transform: "translate(-50%,-50%)",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 3, opacity: isDragging ? 0.3 : 1,
              }}>
                {p ? (
                  <div onPointerDown={(e) => startDrag(e, pid, i)} style={{ cursor: "grab", touchAction: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                    <Token player={p} />
                    <span style={tokenName}>{firstName(p.name)}</span>
                  </div>
                ) : (
                  <div style={{
                    width: 44, height: 44, borderRadius: 14, border: "2px dashed rgba(255,255,255,.6)",
                    display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,.85)",
                    fontSize: 10.5, fontWeight: 700, background: "rgba(255,255,255,.08)",
                  }}>{s.slot}</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bench */}
        <Card>
          <SectionLabel action={<span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>{t.drag_hint}</span>}>
            {t.bench} · {roster.length}
          </SectionLabel>
          <div className="bench-list">
            {roster.length === 0 && <span style={{ fontSize: 13, color: "var(--muted)", padding: "8px 0" }}>{t.all_on_pitch}</span>}
            {roster.map(p => (
              <div key={p.id} onPointerDown={(e) => startDrag(e, p.id, null)}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, cursor: "grab", touchAction: "none", flexShrink: 0, width: 60 }}>
                <div style={{ position: "relative" }}>
                  <Avatar name={p.name} size={48} />
                  <span style={{ position: "absolute", bottom: -3, insetInlineEnd: -3, width: 14, height: 14, borderRadius: "50%", background: AVAIL[p.availability].color, border: "2.5px solid var(--card)" }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 60, textAlign: "center" }}>{firstName(p.name)}</span>
                <Pill color="brand">{p.position}</Pill>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <button onClick={save} disabled={saving}
        style={{ ...primaryBtn, marginTop: 16, width: "100%" }}>
        <Icon name={saved ? "check" : "download"} size={18} stroke={2.4} />
        {saved ? t.saved + "!" : (saving ? "…" : t.save_lineup)}
      </button>

      {/* Drag ghost */}
      {drag && (() => {
        const p = byId(drag.pid);
        if (!p) return null;
        return createPortal(
          <div style={{ position: "fixed", left: drag.x, top: drag.y, transform: "translate(-50%,-50%)", pointerEvents: "none", zIndex: 9999, opacity: 0.92 }}>
            <Token player={p} big />
          </div>, document.body);
      })()}
    </div>
  );
}
