import { useEffect, useMemo, useState } from "react";
import { Avatar, Card, Icon, Pill, SectionLabel, StarRating, Segmented, primaryBtn } from "../ui/kit.jsx";
import { t } from "../data/strings.js";
import { useSquad } from "../state/squad.jsx";
import { getEvalCriteria, createEvaluation } from "../lib/api.js";
import StateNote from "../components/StateNote.jsx";

const COACH_NAME = "Coach Walid"; // No auth yet — evaluations are recorded under a generic coach.
const today = () => new Date().toISOString().slice(0, 10);

const inputStyle = {
  width: "100%", boxSizing: "border-box", border: "1px solid var(--line)", borderRadius: 12,
  padding: "11px 12px", fontFamily: "inherit", fontSize: 14, color: "var(--ink)",
  background: "var(--card)", outline: "none",
};

export default function EvaluateScreen() {
  const { players, team, loading, error } = useSquad();
  const [criteria, setCriteria] = useState(null);
  const [critError, setCritError] = useState(null);

  useEffect(() => {
    getEvalCriteria().then(setCriteria).catch(e => setCritError(e.message || String(e)));
  }, []);

  if (loading || !criteria) return <StateNote>Loading evaluation form…</StateNote>;
  if (error) return <StateNote tone="error">Couldn't load the squad: {error}</StateNote>;
  if (critError) return <StateNote tone="error">Couldn't load criteria: {critError}</StateNote>;
  if (!players.length) return <StateNote>No players to evaluate yet.</StateNote>;

  return <Evaluate players={players} team={team} criteria={criteria} />;
}

function Evaluate({ players, team, criteria }) {
  const [pid, setPid] = useState(players[0].id);
  const [picking, setPicking] = useState(false);
  const [ratings, setRatings] = useState({});       // { criterionKey: stars 1..5 }
  const [date, setDate] = useState(today());
  const [type, setType] = useState("training");
  const [opponent, setOpponent] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [doneFor, setDoneFor] = useState(null);

  const player = players.find(p => p.id === pid);
  const filled = useMemo(() => criteria.filter(c => ratings[c.key] > 0).length, [criteria, ratings]);
  const ready = filled === criteria.length && !submitting;
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
            <div key={p.id} onClick={() => { setPid(p.id); setPicking(false); }}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px", borderRadius: 12, cursor: "pointer", background: p.id === pid ? "var(--brand-tint)" : "transparent" }}>
              <Avatar name={p.name} size={34} />
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{p.name}</span>
              <Pill color="brand">{p.position}</Pill>
              {p.id === pid && <Icon name="check" size={16} color="var(--brand)" stroke={3} />}
            </div>
          ))}
        </Card>
      )}

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

      {/* Progress */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1, height: 6, borderRadius: 6, background: "var(--track)", overflow: "hidden" }}>
          <div style={{ width: (filled / criteria.length * 100) + "%", height: "100%", background: "var(--brand)", borderRadius: 6, transition: "width .3s" }} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", fontFamily: "Sora" }}>{filled}/{criteria.length}</span>
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
