import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Avatar, Card, Icon, Pill, Segmented, SectionLabel, AVAIL, primaryBtn, overall, ratingColor } from "../ui/kit.jsx";
import { t } from "../data/strings.js";
import { useSquad } from "../state/squad.jsx";
import { getFormations, getLineups, getLineupDetail, saveLineup, getPositionRatings } from "../lib/api.js";
import { suggestLineup } from "../lib/lineup.js";
import StateNote from "../components/StateNote.jsx";

const today = () => new Date().toISOString().slice(0, 10);
const firstName = (name) => name.split(" ")[0];

function Token({ player, big, rating }) {
  const ac = AVAIL[player.availability].color;
  const sz = big ? 52 : 44;
  return (
    <div style={{
      width: sz, height: sz, borderRadius: 15, background: "#fff", position: "relative",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "Sora", fontWeight: 800, fontSize: sz * 0.4, color: "var(--brand-deep)",
      boxShadow: `0 3px 8px rgba(0,0,0,.3), 0 0 0 3px ${ac}`,
    }}>
      {player.number}
      {rating != null && (
        <span style={{
          position: "absolute", bottom: -7, insetInlineEnd: -9, minWidth: 20, height: 18, padding: "0 5px",
          borderRadius: 999, background: ratingColor(rating), color: "#fff", fontFamily: "Sora",
          fontWeight: 800, fontSize: 10.5, lineHeight: "18px", textAlign: "center",
          border: "1.5px solid #fff", boxShadow: "0 1px 3px rgba(0,0,0,.35)",
        }}>{rating}</span>
      )}
    </div>
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
// Badge sitting above the player token showing the player's own registered
// position (not the formation slot they're filling).
const posBadge = {
  fontSize: 9.5, fontWeight: 800, letterSpacing: ".04em", color: "var(--brand-deep)", background: "#fff",
  padding: "1px 6px", borderRadius: 999, lineHeight: 1.5, boxShadow: "0 1px 3px rgba(0,0,0,.3)",
};
const ctxInput = {
  width: "100%", boxSizing: "border-box", border: "1px solid var(--line)", borderRadius: 12,
  padding: "11px 12px", fontFamily: "inherit", fontSize: 14, color: "var(--ink)", background: "var(--card)", outline: "none",
};
// Secondary "Suggest best XI" action (US-7). The filled brand look is the
// "active" state, shown only while the suggested XI is actually applied; once
// the coach edits or loads a different lineup it drops to a neutral outline so
// the button reads as an available action rather than a toggle that's stuck on.
const suggestBtnBase = {
  display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer",
  borderRadius: 12, padding: "7px 13px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700,
  border: "1px solid", transition: "background .14s, color .14s, border-color .14s",
};
const suggestBtnActive = { ...suggestBtnBase, borderColor: "var(--brand)", background: "var(--brand-tint)", color: "var(--brand-deep)" };
const suggestBtnIdle = { ...suggestBtnBase, borderColor: "var(--line-strong)", background: "var(--card)", color: "var(--muted)" };

export default function LineupScreen() {
  const { players, team, loading, error } = useSquad();
  const [formations, setFormations] = useState(null);
  const [ratings, setRatings] = useState(null);
  const [loadErr, setLoadErr] = useState(null);

  useEffect(() => {
    getFormations().then(setFormations).catch(e => setLoadErr(e.message || String(e)));
  }, []);
  useEffect(() => {
    if (team?.id) getPositionRatings(team.id).then(setRatings).catch(e => setLoadErr(e.message || String(e)));
  }, [team?.id]);

  if (loading || !formations || !ratings) return <StateNote>Loading lineup builder…</StateNote>;
  if (error) return <StateNote tone="error">Couldn't load the squad: {error}</StateNote>;
  if (loadErr) return <StateNote tone="error">Couldn't load formations: {loadErr}</StateNote>;
  if (!formations.length) return <StateNote tone="error">No formations configured.</StateNote>;

  return <Builder players={players} team={team} formations={formations} ratings={ratings} />;
}

function Builder({ players, team, formations, ratings }) {
  const byId = id => players.find(p => p.id === id);

  const [formationId, setFormationId] = useState(formations[0].id);
  const [assign, setAssign] = useState(() => suggestLineup(formations[0].slots, players, ratings));
  const [suggested, setSuggested] = useState(true);
  const [drag, setDrag] = useState(null); // { pid, x, y, from }
  const [name, setName] = useState("");
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
  const tentativeCount = Object.values(assign).filter(id => byId(id)?.availability === "maybe").length;
  const unavailableStarters = Object.values(assign).map(byId).filter(p => p && p.availability === "out");
  const unavailableCount = unavailableStarters.length;

  const changeFormation = (id) => {
    const f = formations.find(x => x.id === id);
    setFormationId(id);
    setAssign(suggestLineup(f.slots, players, ratings));
    setSuggested(true);
  };

  const newLineup = () => {
    setCurrentId(null);
    setName("");
    setMatchDate(today());
    setOpponent("");
    setFormationId(formations[0].id);
    setAssign(suggestLineup(formations[0].slots, players, ratings));
    setSuggested(true);
  };

  // Explicit one-tap "best XI" for the current formation (US-7).
  const suggestNow = () => {
    setAssign(suggestLineup(slots, players, ratings));
    setSuggested(true);
  };

  const loadExisting = async (id) => {
    try {
      const d = await getLineupDetail(id);
      setCurrentId(d.id);
      setFormationId(d.formation.id);
      setName(d.name || "");
      setMatchDate(d.match_date || today());
      setOpponent(d.opponent || "");
      setAssign(d.assign);
      setSuggested(false);
    } catch (e) {
      alert("Couldn't load lineup: " + (e.message || e));
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const id = await saveLineup({
        id: currentId, teamId: team.id, formationId, name, matchDate, opponent, assign,
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
        setSuggested(false);
      } else if (d.from != null) {
        setAssign(a => { const na = { ...a }; delete na[d.from]; return na; });
        setSuggested(false);
      }
      setDrag(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, [drag ? true : false, formationId]);

  return (
    // -webkit- prefixes are required for iOS Safari: without them a touch on a
    // draggable token starts native text selection instead of a drag (#35).
    <div style={{ userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none" }}>
      {/* Match context toolbar */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, flex: "1 1 150px" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>{t.load_lineup}</span>
            <select value={currentId || ""} onChange={e => (e.target.value ? loadExisting(e.target.value) : newLineup())} style={ctxInput}>
              <option value="">{t.new_lineup}</option>
              {lineups.map(l => (
                <option key={l.id} value={l.id}>
                  {l.name
                    ? `${l.name} (${l.formation?.name})`
                    : `${l.match_date || "No date"}${l.opponent ? ` · vs ${l.opponent}` : ""} (${l.formation?.name})`}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, flex: "1 1 100%" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>{t.lineup_name}</span>
            <input value={name} onChange={e => setName(e.target.value)} placeholder={t.lineup_name_ph} style={ctxInput} />
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
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <Segmented size="sm" value={formationId} onChange={changeFormation}
            options={formations.map(f => ({ value: f.id, label: f.name }))} />
          <button onClick={suggestNow} style={suggested ? suggestBtnActive : suggestBtnIdle}>
            <Icon name="trophy" size={16} stroke={2.2} />
            {t.suggest_xi}
          </button>
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 14, fontSize: 12.5, fontWeight: 700, color: "var(--muted)" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#16A35A" }} />{onCount} {t.available_lc}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: tentativeCount ? "#A16207" : "var(--muted)" }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: tentativeCount ? "#CA8A04" : "var(--line-strong)" }} />{tentativeCount} {t.tentative_lc}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: unavailableCount ? "#B91C1C" : "var(--muted)" }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: unavailableCount ? "#DC2626" : "var(--line-strong)" }} />{unavailableCount} {t.unavailable_lc}
          </span>
        </div>
      </div>

      {/* US-7: hint shown while the on-pitch XI is the auto-suggestion */}
      {suggested && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8, marginBottom: 12, padding: "10px 12px",
          background: "var(--brand-tint)", border: "1px solid var(--line)", borderRadius: 12,
          color: "var(--brand-deep)", fontSize: 12.5, fontWeight: 600,
        }}>
          <Icon name="trophy" size={15} color="var(--brand)" stroke={2.4} />
          {t.suggested_note}
        </div>
      )}

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
                  <div onPointerDown={(e) => startDrag(e, pid, i)} style={{ cursor: "grab", touchAction: "none", WebkitUserSelect: "none", userSelect: "none", WebkitTouchCallout: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                    <span style={posBadge}>{p.position}</span>
                    <Token player={p} rating={overall(p.skills)} />
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
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, cursor: "grab", touchAction: "none", WebkitUserSelect: "none", userSelect: "none", WebkitTouchCallout: "none", flexShrink: 0, width: 66 }}>
                <div style={{ position: "relative" }}>
                  <Avatar name={p.name} size={48} />
                  <span style={{ position: "absolute", bottom: -3, insetInlineEnd: -3, width: 14, height: 14, borderRadius: "50%", background: AVAIL[p.availability].color, border: "2.5px solid var(--card)" }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 66, textAlign: "center" }}>{firstName(p.name)}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Pill color="brand">{p.position}</Pill>
                  <span style={{ fontFamily: "Sora", fontWeight: 800, fontSize: 12.5, color: ratingColor(overall(p.skills)) }}>{overall(p.skills)}</span>
                </div>
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
