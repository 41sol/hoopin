import { useCallback, useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { Avatar, Card, Icon, Pill, SectionLabel, StarRating, FractionalStars, SkillBar, Segmented, ratingColor, primaryBtn } from "../ui/kit.jsx";
import { t } from "../data/strings.js";
import { useSquad } from "../state/squad.jsx";
import { getEvalCriteria, createEvaluation, createSkillEvaluation, setAutoApplyEval, savePlayerSkills, getSessionAttendance, setAttendance, getRatingHistory, getSkillRatingStats, recordSkillRatings } from "../lib/api.js";
import StateNote from "../components/StateNote.jsx";

const COACH_NAME = "Coach Walid"; // No auth yet — evaluations are recorded under a generic coach.
const today = () => new Date().toISOString().slice(0, 10);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// "2026-06-25" -> "Jun 25" (parsed by parts to avoid a UTC/local off-by-one).
function fmtHistDate(d) {
  const [, m, day] = d.split("-");
  return `${MONTHS[Number(m) - 1]} ${Number(day)}`;
}

// The four rated categories, in display order, with their icon + short header.
const HIST_COLS = [
  { key: "technical",  label: t.col_technical,  short: "Tech", icon: "football" },
  { key: "tactical",   label: t.col_tactical,   short: "Tac",  icon: "lineup" },
  { key: "workrate",   label: t.col_workrate,   short: "Work", icon: "flame" },
  { key: "discipline", label: t.col_discipline, short: "Disc", icon: "whistle" },
];

// Small "avg N" chip — the running average of a category's past ratings. Shown on
// each rating card so the coach sees the player's history while rating (US-5).
function AvgBadge({ value }) {
  if (value == null) return null;
  return (
    <span title="Average of past ratings" style={{
      display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 700,
      color: "var(--muted)", background: "var(--track)", border: "1px solid var(--line)",
      padding: "3px 9px", borderRadius: 999, whiteSpace: "nowrap",
    }}>
      {t.hist_avg} <span style={{ fontFamily: "Sora", fontWeight: 800, color: ratingColor(value) }}>{value}</span>
    </span>
  );
}

const inputStyle = {
  width: "100%", boxSizing: "border-box", border: "1px solid var(--line)", borderRadius: 12,
  padding: "11px 12px", fontFamily: "inherit", fontSize: 14, color: "var(--ink)",
  background: "var(--card)", outline: "none",
};

export default function EvaluateScreen() {
  const { players, team, loading, error, replacePlayer } = useSquad();
  const [criteria, setCriteria] = useState(null);
  const [critError, setCritError] = useState(null);

  useEffect(() => {
    getEvalCriteria().then(setCriteria).catch(e => setCritError(e.message || String(e)));
  }, []);

  if (loading || !criteria) return <StateNote>Loading evaluation form…</StateNote>;
  if (error) return <StateNote tone="error">Couldn't load the squad: {error}</StateNote>;
  if (critError) return <StateNote tone="error">Couldn't load criteria: {critError}</StateNote>;
  if (!players.length) return <StateNote>No players to evaluate yet.</StateNote>;

  // "Technical Skill" is now captured by the Technical Skills card below (per-position
  // sub-skills), so drop the single-star criterion to avoid double-rating it.
  const visibleCriteria = criteria.filter(c => c.key !== "technical");

  return <Evaluate players={players} team={team} criteria={visibleCriteria} replacePlayer={replacePlayer} />;
}

function Evaluate({ players, team, criteria, replacePlayer }) {
  const [pid, setPid] = useState(players[0].id);
  const [picking, setPicking] = useState(false);
  const [ratings, setRatings] = useState({});       // { criterionKey: stars 1..5 }
  const [date, setDate] = useState(today());
  const [type, setType] = useState("training");
  const [opponent, setOpponent] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [doneFor, setDoneFor] = useState(null);
  const [techComplete, setTechComplete] = useState(false); // all Technical Skills sub-skills rated
  const techRef = useRef(null);                             // applies/records the technical ratings on submit

  // Read-only rating history for the selected player (US-5).
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const loadHistory = useCallback(() => {
    getRatingHistory(pid).then(setHistory).catch(() => setHistory([])); // non-fatal: empty log
  }, [pid]);
  useEffect(() => { setHistory([]); loadHistory(); }, [loadHistory]);

  // Running average per category over the whole history — drives the per-card badges.
  const histAvg = useMemo(() => {
    const out = {};
    for (const c of HIST_COLS) {
      const vals = history.map(r => r[c.key]).filter(v => v != null);
      out[c.key] = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
    }
    return out;
  }, [history]);
  const [autoApply, setAutoApplyState] = useState(!!team?.auto_apply_eval);
  const onAutoApplyChange = async (v) => {
    setAutoApplyState(v);
    try { if (team?.id) await setAutoApplyEval(team.id, v); }
    catch (e) { alert("Couldn't save the auto-apply setting: " + (e.message || e)); }
  };

  const player = players.find(p => p.id === pid);
  const filled = useMemo(() => criteria.filter(c => ratings[c.key] > 0).length, [criteria, ratings]);
  const total = criteria.length + 1;                // session criteria + the Technical Skills card
  const done = filled + (techComplete ? 1 : 0);     // Technical Skills counts once all its sub-skills are rated
  const ready = filled === criteria.length && techComplete && !submitting;
  const setR = (k, v) => setRatings(r => ({ ...r, [k]: v }));

  const reset = () => { setRatings({}); setNote(""); setOpponent(""); setType("training"); setDate(today()); setDoneFor(null); };

  const submit = async () => {
    setSubmitting(true);
    try {
      await createEvaluation({
        playerId: player.id,
        teamId: team?.id ?? null,
        coachName: COACH_NAME,
        evalDate: date,
        evalType: type,
        opponent: type === "match" ? opponent : "",
        note,
        scores: criteria.map(c => ({ criterionId: c.id, value: (ratings[c.key] || 0) * 20 })),
      });
      // Apply/record the Technical Skills card per its auto-apply / approve / decline state.
      await techRef.current?.commit();
      loadHistory(); // include the just-recorded session in the history log
      setDoneFor(player.name);
    } catch (e) {
      alert("Couldn't submit evaluation: " + (e.message || e));
    } finally {
      setSubmitting(false);
    }
  };

  if (doneFor) {
    return (
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "48px 8px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div style={{ width: 84, height: 84, borderRadius: "50%", background: "var(--brand-tint)", display: "flex", alignItems: "center", justifyContent: "center", animation: "hp-pop .4s cubic-bezier(.2,1.3,.4,1)" }}>
          <Icon name="check" size={44} color="var(--brand)" stroke={3} />
        </div>
        <div>
          <h2 style={{ margin: "0 0 6px", fontFamily: "Sora", fontWeight: 800, fontSize: 22, color: "var(--ink)" }}>{t.saved}!</h2>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: 14.5, maxWidth: 280 }}>
            Evaluation for <strong style={{ color: "var(--ink)" }}>{doneFor}</strong> {t.eval_synced}
          </p>
        </div>
        <button onClick={reset} style={primaryBtn}>{t.rate_another}</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      {/* Player selector */}
      <SectionLabel>{t.select_player}</SectionLabel>
      <Card pad={10} onClick={() => setPicking(p => !p)} style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", marginBottom: picking ? 8 : 16 }}>
        <Avatar name={player.name} num={player.number} size={46} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15.5, color: "var(--ink)" }}>{player.name}</div>
          <div style={{ fontSize: 12.5, color: "var(--muted)", fontWeight: 600 }}>#{player.number} · {player.position} · {player.age} {t.years}</div>
        </div>
        <Icon name="chevD" size={20} color="var(--muted)" style={{ transform: picking ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
      </Card>
      {picking && (
        <Card pad={6} style={{ marginBottom: 16, maxHeight: 280, overflowY: "auto" }}>
          {players.map(p => (
            <button key={p.id} onClick={() => { setPid(p.id); setPicking(false); }} aria-pressed={p.id === pid}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px", borderRadius: 12, cursor: "pointer", background: p.id === pid ? "var(--brand-tint)" : "transparent", border: "none", width: "100%", textAlign: "start", font: "inherit" }}>
              <Avatar name={p.name} size={34} />
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "var(--ink)", textAlign: "start" }}>{p.name}</span>
              <Pill color="brand">{p.position}</Pill>
              {p.id === pid && <Icon name="check" size={16} color="var(--brand)" stroke={3} />}
            </button>
          ))}
        </Card>
      )}

      {/* View rating history (US-5) — read-only log of the player's past ratings */}
      <button onClick={() => setShowHistory(true)} style={{
        display: "flex", alignItems: "center", gap: 10, width: "100%", boxSizing: "border-box",
        border: "1px solid var(--line)", background: "var(--card)", color: "var(--ink)",
        borderRadius: 14, padding: "12px 16px", fontFamily: "inherit", fontSize: 14, fontWeight: 700,
        cursor: "pointer", marginBottom: 16, boxShadow: "var(--shadow)",
      }}>
        <span style={{ width: 28, height: 28, borderRadius: 9, background: "var(--brand-tint)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon name="clock" size={16} color="var(--brand)" />
        </span>
        <span style={{ flex: 1, textAlign: "start" }}>{t.view_history}</span>
        {history.length > 0 && <Pill color="muted">{history.length}</Pill>}
        <Icon name="chevR" size={18} color="var(--muted)" />
      </button>

      {showHistory && <HistoryModal player={player} rows={history} avg={histAvg} onClose={() => setShowHistory(false)} />}

      {/* Session context */}
      <Card style={{ marginBottom: 16 }}>
        <SectionLabel>{t.session}</SectionLabel>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, flex: "1 1 160px" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>{t.date}</span>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>{t.type_training} / {t.type_match}</span>
            <Segmented value={type} onChange={setType} options={[{ value: "training", label: t.type_training }, { value: "match", label: t.type_match }]} />
          </div>
          {type === "match" && (
            <label style={{ display: "flex", flexDirection: "column", gap: 6, flex: "1 1 160px" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>{t.opponent}</span>
              <input value={opponent} onChange={e => setOpponent(e.target.value)} placeholder={t.opponent_ph} style={inputStyle} />
            </label>
          )}
        </div>
      </Card>

      {/* Attendance (US-4) — the selected player's status for this session */}
      <div style={{ marginBottom: 16 }}>
        <AttendanceCard player={player} teamId={team?.id} date={date} type={type} />
      </div>

      {/* Progress — session criteria + the Technical Skills card (complete once all its sub-skills are rated) */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1, height: 6, borderRadius: 6, background: "var(--track)", overflow: "hidden" }}>
          <div style={{ width: (done / total * 100) + "%", height: "100%", background: "var(--brand)", borderRadius: 6, transition: "width .3s" }} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", fontFamily: "Sora" }}>{done}/{total}</span>
      </div>

      {/* Technical skills — per-position sub-skills that feed back into Squad ratings (US-3) */}
      <div style={{ marginBottom: 16 }}>
        <AdvancedTechnical key={player.id} ref={techRef} player={player} team={team} evalDate={date}
          autoApply={autoApply} onAutoApplyChange={onAutoApplyChange} onApplied={replacePlayer}
          onRatedChange={setTechComplete} histAvg={histAvg.technical} />
      </div>

      {/* Criteria */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {criteria.map(c => (
          <Card key={c.key} pad={14}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: "var(--brand-tint)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon name={c.icon} size={18} color="var(--brand)" />
              </div>
              <span style={{ flex: 1, fontWeight: 700, fontSize: 14.5, color: "var(--ink)" }}>{c.label}</span>
              <AvgBadge value={histAvg[c.key]} />
              {ratings[c.key] > 0 && <span style={{ fontFamily: "Sora", fontWeight: 800, color: "var(--brand)", fontSize: 15 }}>{ratings[c.key]}.0</span>}
            </div>
            <StarRating value={ratings[c.key] || 0} onChange={v => setR(c.key, v)} />
          </Card>
        ))}
      </div>

      {/* Notes */}
      <div style={{ marginTop: 14 }}>
        <SectionLabel>{t.notes}</SectionLabel>
        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder={t.notes_ph} rows={3}
          style={{ ...inputStyle, borderRadius: 16, padding: 14, resize: "none" }} />
      </div>

      <button disabled={!ready} onClick={submit}
        style={{ ...primaryBtn, marginTop: 16, width: "100%", opacity: ready ? 1 : .45, cursor: ready ? "pointer" : "not-allowed" }}>
        {submitting ? "…" : t.submit}
      </button>
    </div>
  );
}

/* ---------- Attendance (US-4) ---------- */

// Status options share the colours/icons the Profile screen's attendance log uses.
const ATT_OPTS = [
  { value: "present", label: t.att_present, color: "#16A35A", icon: "check" },
  { value: "late",    label: t.att_late,    color: "#CA8A04", icon: "clock" },
  { value: "absent",  label: t.att_absent,  color: "#DC2626", icon: "x" },
];

// The selected player's attendance for the current session (date + type). Tapping
// a status saves it immediately (upsert); tapping the active one again clears it.
// Reloads when the player or session changes so an existing status shows on revisit.
function AttendanceCard({ player, teamId, date, type }) {
  const [status, setStatus] = useState(null);   // 'present' | 'late' | 'absent' | null
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!teamId) { setLoading(false); return; }
    let alive = true;
    setLoading(true);
    getSessionAttendance(teamId, player.id, date, type)
      .then(s => { if (alive) setStatus(s); })
      .catch(() => { if (alive) setStatus(null); }) // non-fatal: card starts unset
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [teamId, player.id, date, type]);

  const mark = async (value) => {
    const next = status === value ? null : value; // tap the active status again to clear
    const prev = status;
    setStatus(next);
    setSaving(true);
    try {
      await setAttendance(teamId, player.id, date, type, next);
    } catch (e) {
      setStatus(prev); // revert on failure
      alert("Couldn't save attendance: " + (e.message || e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <SectionLabel action={
        loading ? <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--muted)" }}>{t.att_loading}</span>
        : saving ? <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--muted)" }}>…</span>
        : status ? <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: "var(--brand)" }}><Icon name="check" size={14} stroke={2.6} /> {t.saved}</span>
        : null
      }>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 24, height: 24, borderRadius: 8, background: "var(--brand-tint)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name="calendar" size={14} color="var(--brand)" />
          </span>
          {t.attendance}
        </span>
      </SectionLabel>

      <div style={{ display: "flex", gap: 10 }}>
        {ATT_OPTS.map(o => {
          const active = status === o.value;
          return (
            <button key={o.value} onClick={() => mark(o.value)} disabled={loading} aria-pressed={active}
              style={{
                flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "12px 10px", borderRadius: 14, cursor: loading ? "default" : "pointer",
                border: "1px solid " + (active ? o.color : "var(--line)"),
                background: active ? o.color : "var(--card)",
                color: active ? "#fff" : "var(--muted)",
                fontSize: 13.5, fontWeight: 700, fontFamily: "inherit", transition: "all .15s",
              }}>
              <Icon name={o.icon} size={17} color={active ? "#fff" : o.color} stroke={2.6} />
              {o.label}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

/* ---------- Advanced technical rating (US-3) ---------- */

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const STAR_TO_100 = 20; // 5 stars == 100, matching the simplified card's mapping.

// Per-skill suggestion = a cumulative running average (#48). The current squad
// value is treated as the old average of the player's previous ratings, and the
// new rating (stars×20, so 1★=20 … 5★=100) is blended in:
//   newAvg = (oldAvg × N + ratingValue) / (N + 1)
// where N = number of previous ratings for this skill (`stat.count`). Because the
// current value is the old average, any rating ≥ the current value can never pull
// it down. Rounded half-up to the nearest whole point (Math.round, values are
// non-negative): e.g. (70×12 + 100)/13 = 72.3 → 72; 73.5 → 74.
function suggestionFor(value, stars, stat) {
  if (!stars) return { delta: 0, newValue: value };
  const ratingValue = stars * STAR_TO_100; // 1★=20 … 5★=100
  const n = stat?.count || 0;              // previous ratings for this skill
  const newValue = clamp(Math.round((value * n + ratingValue) / (n + 1)), 0, 100);
  return { delta: newValue - value, newValue };
}

const actionBtn = {
  display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid var(--brand)",
  background: "var(--brand)", color: "#fff", padding: "8px 14px", borderRadius: 999,
  fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
};
const ghostBtn = {
  border: "1px solid var(--line)", background: "var(--card)", color: "var(--muted)",
  padding: "12px 16px", borderRadius: 16, fontSize: 14.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
};
const linkBtn = {
  border: "none", background: "none", color: "var(--muted)", padding: 0,
  fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline",
};

function DeltaBadge({ delta }) {
  if (!delta) return <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--muted)" }}>±0</span>;
  const c = delta > 0 ? "#16A35A" : "#DC2626";
  return <span style={{ fontSize: 11.5, fontWeight: 800, color: c, background: c + "1f", padding: "2px 8px", borderRadius: 999 }}>{delta > 0 ? "+" : ""}{delta}</span>;
}

function Modal({ children, onClose }) {
  return (
    <div className="hp-modal-overlay" onClick={onClose} style={{ zIndex: 1000 }} role="dialog" aria-modal="true">
      <div className="hp-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
        {children}
      </div>
    </div>
  );
}

const AdvancedTechnical = forwardRef(function AdvancedTechnical({ player, team, evalDate, autoApply, onAutoApplyChange, onApplied, onRatedChange, histAvg }, ref) {
  const skills = player.skillList;
  const [stars, setStars] = useState({});
  const [modal, setModal] = useState(false);
  const [approved, setApproved] = useState(false); // coach approved applying (auto-apply off flow)

  // Prior per-skill rating data points (eval + manual), keyed by skillId. Drives
  // the running-average suggestion (#48). Refetched per player/position mount.
  const [stats, setStats] = useState({});
  useEffect(() => {
    let alive = true;
    getSkillRatingStats(player.id, player.position)
      .then(s => { if (alive) setStats(s); })
      .catch(() => { if (alive) setStats({}); }); // non-fatal: treat as no prior ratings
    return () => { alive = false; };
  }, [player.id, player.position]);

  const setStar = (k, v) => setStars(s => ({ ...s, [k]: v }));

  const ratedCount = skills.filter(s => (stars[s.key] || 0) > 0).length;
  const allRated = skills.length > 0 && ratedCount === skills.length;

  // Report completion up so the progress indicator can count this card as one item.
  // A position with no sub-skills has nothing to rate, so treat it as already complete.
  const complete = skills.length === 0 || allRated;
  useEffect(() => { onRatedChange?.(complete); }, [complete, onRatedChange]);
  const accumulated = skills.length ? skills.reduce((a, s) => a + (stars[s.key] || 0), 0) / skills.length : 0;
  const rows = skills.map(s => {
    const st = stars[s.key] || 0;
    const { delta, newValue } = suggestionFor(s.value, st, stats[s.skillId]);
    return { skillId: s.skillId, key: s.key, label: s.label, value: s.value, stars: st, delta, newValue };
  });
  const hasChanges = rows.some(r => r.delta !== 0);

  // Auto-apply pushes the ratings to the squad unconditionally; otherwise the coach must
  // approve. Approving (auto-apply off) locks the stars read-only until the form is submitted.
  const willApply = autoApply || approved;
  const locked = approved && !autoApply;

  // Run by the parent form on submit: record the skill evaluation and, when applying,
  // write the new squad values. No-op when nothing meaningful was suggested.
  useImperativeHandle(ref, () => ({
    commit: async () => {
      // Every star rating given is a data point for the moving average (#48),
      // recorded on submit independent of whether the suggestion is applied.
      const rated = rows.filter(r => r.stars > 0);
      if (rated.length) {
        await recordSkillRatings(player.id, player.position, rated.map(r => ({ skillId: r.skillId, value: r.stars * STAR_TO_100 })), "eval");
      }
      if (!hasChanges) return;
      const apply = willApply;
      if (apply) {
        await savePlayerSkills(player.id, player.position, rows.map(r => ({ skillId: r.skillId, value: r.newValue })));
      }
      await createSkillEvaluation({
        playerId: player.id, teamId: team?.id ?? null, position: player.position,
        coachName: COACH_NAME, evalDate: evalDate || today(), applied: apply,
        scores: rows.map(r => ({ skillId: r.skillId, stars: r.stars, prevValue: r.value, suggestedDelta: r.delta, appliedValue: apply ? r.newValue : null })),
      });
      if (apply) {
        const newSkills = { ...player.skills };
        rows.forEach(r => { newSkills[r.key] = r.newValue; });
        const newList = player.skillList.map(s => ({ ...s, value: newSkills[s.key] ?? s.value }));
        onApplied({ ...player, skills: newSkills, skillList: newList });
      }
    },
  }));

  return (
    <Card>
      <SectionLabel action={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--muted)" }}>{t.auto_apply}</span>
          <Segmented size="sm" value={autoApply} onChange={onAutoApplyChange}
            options={[{ value: false, label: "Off" }, { value: true, label: "On" }]} />
        </span>
      }>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ width: 24, height: 24, borderRadius: 8, background: "var(--brand-tint)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name="football" size={14} color="var(--brand)" />
          </span>
          {t.advanced_rating}{player.position ? " · " + player.position : ""}
          <AvgBadge value={histAvg} />
        </span>
      </SectionLabel>

      {skills.length === 0 ? (
        <StateNote>No sub-skills for this position yet.</StateNote>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {skills.map(s => (
              <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 130px", minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{s.label}</div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 600 }}>now {s.value}</div>
                </div>
                <StarRating value={stars[s.key] || 0} onChange={v => setStar(s.key, v)} size={26} readOnly={locked} />
              </div>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--line)", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 150px", minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>{t.accumulated}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}>
                <FractionalStars value={accumulated} size={20} />
                <span style={{ fontFamily: "Sora", fontWeight: 800, fontSize: 16, color: "var(--ink)" }}>{accumulated.toFixed(1)}</span>
              </div>
            </div>
            {!allRated ? (
              <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>{t.rate_all_hint}</span>
            ) : !hasChanges ? (
              <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>{t.no_changes}</span>
            ) : autoApply ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>
                <Icon name="check" size={14} color="var(--brand)" stroke={2.6} /> {t.applies_on_submit}
              </span>
            ) : approved ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 700, color: "var(--brand)" }}>
                  <Icon name="check" size={15} stroke={2.6} /> {t.approved_on_submit}
                </span>
                <button onClick={() => setApproved(false)} style={linkBtn}>{t.edit_ratings}</button>
              </span>
            ) : (
              <button onClick={() => setModal(true)} style={actionBtn}>
                <Icon name="up" size={14} stroke={2.6} /> {t.suggest_improvements}
              </button>
            )}
          </div>
        </>
      )}

      {modal && (
        <Modal onClose={() => setModal(false)}>
          <SectionLabel>{t.suggested_changes}</SectionLabel>
          <div style={{ marginBottom: 14, fontSize: 12, color: "var(--muted)", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="journey" size={14} color="var(--brand)" /> {t.avg_suggestion_note}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {rows.map(r => (
              <div key={r.key} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>{r.label}</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <DeltaBadge delta={r.delta} />
                    <span style={{ fontFamily: "Sora", fontWeight: 800, fontSize: 14, color: ratingColor(r.newValue) }}>{r.value} → {r.newValue}</span>
                  </span>
                </div>
                <div style={{ height: 8, borderRadius: 8, background: "var(--track)", overflow: "hidden" }}>
                  <div style={{ width: r.newValue + "%", height: "100%", borderRadius: 8, background: ratingColor(r.newValue), transition: "width .4s cubic-bezier(.2,.8,.2,1)" }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <button onClick={() => { setApproved(false); setModal(false); }} style={{ ...ghostBtn, flex: 1 }}>{t.decline}</button>
            <button onClick={() => { setApproved(true); setModal(false); }} style={{ ...primaryBtn, flex: 1, padding: "12px 16px" }}>{t.approve_apply}</button>
          </div>
        </Modal>
      )}
    </Card>
  );
});

/* ---------- Rating history (US-5) ---------- */

const thStyle = (align) => ({
  padding: "4px 6px 10px", textAlign: align, fontSize: 10.5, fontWeight: 700,
  color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".04em",
});

// One rating value, coloured on the squad scale; em-dash when a category wasn't rated.
function RatingCell({ value, strong }) {
  if (value == null) return <span style={{ color: "var(--line-strong)", fontWeight: 700 }}>—</span>;
  return <span style={{ fontFamily: "Sora", fontWeight: strong ? 800 : 700, fontSize: strong ? 14.5 : 13.5, color: ratingColor(value) }}>{value}</span>;
}

// Read-only modal: the player's past ratings as a date + 4-category table, newest
// first, with a footer row of per-category averages. No edit/delete controls —
// the log is purely a record (US-5 acceptance criteria).
function HistoryModal({ player, rows, avg, onClose }) {
  return (
    <Modal onClose={onClose}>
      <SectionLabel action={
        <button onClick={onClose} aria-label={t.cancel} style={{ border: "none", background: "none", cursor: "pointer", lineHeight: 0, padding: 4 }}>
          <Icon name="x" size={18} color="var(--muted)" />
        </button>
      }>{t.rating_history} · {player.name}</SectionLabel>

      {rows.length === 0 ? (
        <StateNote>{t.no_history}</StateNote>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle("start")}>{t.hist_date}</th>
                {HIST_COLS.map(c => (
                  <th key={c.key} style={thStyle("center")} title={c.label}>
                    <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                      <Icon name={c.icon} size={15} color="var(--muted)" />
                      <span>{c.short}</span>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} style={{ borderTop: "1px solid var(--line)" }}>
                  <td style={{ padding: "10px 6px", whiteSpace: "nowrap" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{fmtHistDate(r.date)}</div>
                    <span style={{
                      display: "inline-block", marginTop: 4, fontSize: 10, fontWeight: 700,
                      color: r.type === "match" ? "#C2410C" : "var(--muted)",
                      background: r.type === "match" ? "rgba(255,107,44,.13)" : "var(--track)",
                      padding: "2px 8px", borderRadius: 999,
                    }}>{r.type === "match" ? t.type_match : t.type_training}</span>
                  </td>
                  {HIST_COLS.map(c => (
                    <td key={c.key} style={{ padding: "10px 6px", textAlign: "center" }}><RatingCell value={r[c.key]} /></td>
                  ))}
                </tr>
              ))}
              <tr style={{ borderTop: "2px solid var(--line-strong)" }}>
                <td style={{ padding: "10px 6px", fontSize: 10.5, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>{t.hist_avg}</td>
                {HIST_COLS.map(c => (
                  <td key={c.key} style={{ padding: "10px 6px", textAlign: "center" }}><RatingCell value={avg[c.key]} strong /></td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--muted)", fontWeight: 600 }}>
        <Icon name="eval" size={14} color="var(--muted)" /> {t.read_only}
      </div>
    </Modal>
  );
}
