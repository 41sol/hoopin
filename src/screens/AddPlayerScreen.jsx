import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Icon, SectionLabel, ratingColor, primaryBtn } from "../ui/kit.jsx";
import { POSITIONS, POSITION_LINE, FEET } from "../data/static.js";
import { t } from "../data/strings.js";
import { useSquad } from "../state/squad.jsx";
import { getLineSkills, createPlayer } from "../lib/api.js";
import StateNote from "../components/StateNote.jsx";

const DEFAULT_SKILL = 50; // New players' sub-skills start here (#46).

const inputStyle = {
  width: "100%", boxSizing: "border-box", border: "1px solid var(--line)", borderRadius: 12,
  padding: "11px 12px", fontFamily: "inherit", fontSize: 14, color: "var(--ink)",
  background: "var(--card)", outline: "none",
};
const labelStyle = { fontSize: 12, fontWeight: 700, color: "var(--muted)" };
const stepBtn = {
  width: 32, height: 32, borderRadius: 10, border: "1px solid var(--line)", background: "var(--track)",
  color: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
};

function Field({ label, children, flex }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, flex: flex || "1 1 140px" }}>
      <span style={labelStyle}>{label}</span>
      {children}
    </label>
  );
}

export default function AddPlayerScreen() {
  const navigate = useNavigate();
  const { team, addPlayer, loading } = useSquad();

  const [form, setForm] = useState({
    name: "", number: "", position: "ST", age: "", height_cm: "", weight_kg: "",
    foot: "Right", availability: "in",
  });
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const line = POSITION_LINE[form.position];

  // Sub-skills for the chosen position's line, each starting at 50. Reloads when
  // the position changes to a different line so the right set is shown.
  const [skills, setSkills] = useState(null); // [{ skillId, key, label, value }] | null while loading
  const [skillsError, setSkillsError] = useState(null);
  useEffect(() => {
    let alive = true;
    setSkills(null);
    setSkillsError(null);
    getLineSkills(line)
      .then(rows => { if (alive) setSkills(rows.map(s => ({ skillId: s.id, key: s.key, label: s.label, value: DEFAULT_SKILL }))); })
      .catch(e => { if (alive) setSkillsError(e.message || String(e)); });
    return () => { alive = false; };
  }, [line]);

  const bump = (skillId, d) =>
    setSkills(list => list.map(s => (s.skillId === skillId ? { ...s, value: Math.max(0, Math.min(100, s.value + d)) } : s)));

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const canSubmit = form.name.trim() && skills && !submitting && team?.id;

  const submit = async () => {
    if (!form.name.trim()) { setError(t.name_required); return; }
    if (!team?.id) { setError("No team found to add the player to."); return; }
    setSubmitting(true);
    setError(null);
    try {
      const player = await createPlayer({
        teamId: team.id,
        name: form.name.trim(),
        number: form.number === "" ? null : Number(form.number),
        position: form.position,
        line,
        age: form.age === "" ? null : Number(form.age),
        height_cm: form.height_cm === "" ? null : Number(form.height_cm),
        weight_kg: form.weight_kg === "" ? null : Number(form.weight_kg),
        foot: form.foot,
        availability: form.availability,
        skills: skills.map(s => ({ skillId: s.skillId, value: s.value })),
      });
      addPlayer(player);
      navigate(`/squad/${player.id}`);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <StateNote>Loading…</StateNote>;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      {/* Back link */}
      <button onClick={() => navigate("/squad")} style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "none", background: "none", color: "var(--muted)", fontWeight: 700, fontSize: 14, cursor: "pointer", padding: "2px 0", marginBottom: 12 }}>
        <Icon name="chevL" size={18} /> {t.nav_squad}
      </button>

      <h2 style={{ margin: "0 0 16px", fontFamily: "Sora", fontSize: 22, fontWeight: 800, color: "var(--ink)" }}>{t.add_player_title}</h2>

      {/* Details */}
      <Card style={{ marginBottom: 16 }}>
        <SectionLabel>{t.details}</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label={t.player_name} flex="1 1 100%">
            <input value={form.name} onChange={e => setF("name", e.target.value)} placeholder={t.player_name_ph} style={inputStyle} />
          </Field>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
            <Field label={t.number}>
              <input type="number" value={form.number} onChange={e => setF("number", e.target.value)} placeholder="#" style={inputStyle} />
            </Field>
            <Field label={t.pos}>
              <select value={form.position} onChange={e => setF("position", e.target.value)} style={{ ...inputStyle, appearance: "auto" }}>
                {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field label={t.availability}>
              <select value={form.availability} onChange={e => setF("availability", e.target.value)} style={{ ...inputStyle, appearance: "auto" }}>
                <option value="in">{t.avail_in}</option>
                <option value="maybe">{t.avail_maybe}</option>
                <option value="out">{t.avail_out}</option>
              </select>
            </Field>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
            <Field label={t.age}>
              <input type="number" value={form.age} onChange={e => setF("age", e.target.value)} style={inputStyle} />
            </Field>
            <Field label={`${t.height} (cm)`}>
              <input type="number" value={form.height_cm} onChange={e => setF("height_cm", e.target.value)} style={inputStyle} />
            </Field>
            <Field label={`${t.weight} (kg)`}>
              <input type="number" value={form.weight_kg} onChange={e => setF("weight_kg", e.target.value)} style={inputStyle} />
            </Field>
            <Field label={t.foot}>
              <select value={form.foot} onChange={e => setF("foot", e.target.value)} style={{ ...inputStyle, appearance: "auto" }}>
                {FEET.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
          </div>
        </div>
      </Card>

      {/* Skill ratings — default 50 */}
      <Card style={{ marginBottom: 16 }}>
        <SectionLabel>{t.skills}{form.position ? " · " + form.position : ""}</SectionLabel>
        {skillsError ? (
          <StateNote tone="error">Couldn't load skills: {skillsError}</StateNote>
        ) : skills === null ? (
          <StateNote>Loading skills…</StateNote>
        ) : skills.length === 0 ? (
          <StateNote>No sub-skills defined for this position.</StateNote>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {skills.map(s => (
                <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{s.label}</span>
                  <button onClick={() => bump(s.skillId, -1)} style={stepBtn}><Icon name="x" size={14} stroke={2.6} /></button>
                  <span style={{ fontFamily: "Sora", fontWeight: 800, fontSize: 18, color: ratingColor(s.value), minWidth: 30, textAlign: "center" }}>{s.value}</span>
                  <button onClick={() => bump(s.skillId, +1)} style={stepBtn}><Icon name="plus" size={14} stroke={2.6} /></button>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, fontSize: 11.5, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="whistle" size={14} color="var(--brand)" /> {t.skills_default_hint}
            </div>
          </>
        )}
      </Card>

      {error && <div style={{ marginBottom: 12, color: "#DC2626", fontSize: 13.5, fontWeight: 600 }}>{error}</div>}

      <button disabled={!canSubmit} onClick={submit}
        style={{ ...primaryBtn, width: "100%", opacity: canSubmit ? 1 : .45, cursor: canSubmit ? "pointer" : "not-allowed" }}>
        <Icon name="check" size={16} stroke={2.6} /> {submitting ? t.creating : t.create_player}
      </button>
    </div>
  );
}
