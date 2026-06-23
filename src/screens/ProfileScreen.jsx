import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Avatar, Card, Icon, SectionLabel, SkillBar, ratingColor, overall, AVAIL } from "../ui/kit.jsx";
import { ATTENDANCE_LOG, POSITIONS, POSITION_LINE, FEET } from "../data/static.js";
import { t } from "../data/strings.js";
import { useSquad } from "../state/squad.jsx";
import { updatePlayer, savePlayerSkills } from "../lib/api.js";
import StateNote from "../components/StateNote.jsx";

const heroInput = {
  background: "rgba(255,255,255,.2)", border: "1px solid rgba(255,255,255,.35)", color: "#fff",
  borderRadius: 10, padding: "6px 8px", fontFamily: "Sora", fontWeight: 800, fontSize: 18,
  textAlign: "center", width: "100%", outline: "none",
};
const heroSelect = { ...heroInput, fontSize: 14, fontWeight: 700, appearance: "auto" };
const stepBtn = {
  width: 32, height: 32, borderRadius: 10, border: "1px solid var(--line)", background: "var(--track)",
  color: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
};

export default function ProfileScreen() {
  const { playerId } = useParams();
  const navigate = useNavigate();
  const { players, loading, replacePlayer } = useSquad();
  const player = players.find(p => p.id === playerId);

  if (loading && !player) return <StateNote>Loading profile…</StateNote>;
  if (!player) return <StateNote tone="error">Player not found. <button onClick={() => navigate("/squad")} style={{ marginInlineStart: 8, color: "var(--brand)", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>Back to squad</button></StateNote>;

  return <Profile key={player.id} player={player} onSaved={replacePlayer} onBack={() => navigate("/squad")} />;
}

function Profile({ player, onSaved, onBack }) {
  // ----- identity edit -----
  const [editDetails, setEditDetails] = useState(false);
  const [form, setForm] = useState(null);
  const [savingDetails, setSavingDetails] = useState(false);

  const startEdit = () => {
    setForm({
      name: player.name, number: player.number, position: player.position,
      age: player.age, height_cm: player.height_cm, weight_kg: player.weight_kg,
      foot: player.foot, availability: player.availability,
    });
    setEditDetails(true);
  };
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const saveDetails = async () => {
    setSavingDetails(true);
    try {
      const patch = {
        name: form.name.trim() || player.name,
        number: form.number === "" ? null : Number(form.number),
        position: form.position,
        line: POSITION_LINE[form.position] || player.line,
        age: form.age === "" ? null : Number(form.age),
        height_cm: form.height_cm === "" ? null : Number(form.height_cm),
        weight_kg: form.weight_kg === "" ? null : Number(form.weight_kg),
        foot: form.foot,
        availability: form.availability,
      };
      const updated = await updatePlayer(player.id, patch);
      onSaved(updated);
      setEditDetails(false);
    } catch (e) {
      alert("Couldn't save details: " + (e.message || e));
    } finally {
      setSavingDetails(false);
    }
  };

  // ----- skills edit -----
  const [editSkills, setEditSkills] = useState(false);
  const [skillVals, setSkillVals] = useState(null);
  const [savingSkills, setSavingSkills] = useState(false);
  const startSkills = () => { setSkillVals(Object.fromEntries(player.skillList.map(s => [s.key, s.value]))); setEditSkills(true); };
  const bump = (k, d) => setSkillVals(s => ({ ...s, [k]: Math.max(0, Math.min(100, s[k] + d)) }));
  const saveSkills = async () => {
    setSavingSkills(true);
    try {
      const entries = player.skillList.map(s => ({ skillId: s.skillId, value: skillVals[s.key] }));
      await savePlayerSkills(player.id, entries);
      const updated = {
        ...player,
        skillList: player.skillList.map(s => ({ ...s, value: skillVals[s.key] })),
        skills: { ...skillVals },
      };
      onSaved(updated);
      setEditSkills(false);
    } catch (e) {
      alert("Couldn't save skills: " + (e.message || e));
    } finally {
      setSavingSkills(false);
    }
  };

  const display = editDetails ? form : player;
  const ov = overall(editSkills ? skillVals : player.skills);

  const statBox = (label, value, unit, key, editable) => (
    <div style={{ flex: 1, textAlign: "center", padding: "10px 4px" }}>
      {editDetails && editable ? (
        <input type="number" value={form[key]} onChange={e => setF(key, e.target.value)} style={{ ...heroInput, fontSize: 16 }} />
      ) : (
        <div style={{ fontFamily: "Sora", fontWeight: 800, fontSize: 19, color: "#fff" }}>{value}<span style={{ fontSize: 11, opacity: .8, fontWeight: 600 }}>{unit}</span></div>
      )}
      <div style={{ fontSize: 10.5, opacity: .85, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em", marginTop: 6 }}>{label}</div>
    </div>
  );

  return (
    <div>
      {/* Back link */}
      <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "none", background: "none", color: "var(--muted)", fontWeight: 700, fontSize: 14, cursor: "pointer", padding: "2px 0", marginBottom: 12 }}>
        <Icon name="chevL" size={18} /> {t.nav_squad}
      </button>

      {/* Hero */}
      <div style={{ borderRadius: 24, padding: "18px 18px 16px", marginBottom: 16, background: "linear-gradient(150deg, var(--brand), var(--brand-deep))", color: "#fff", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", insetInlineEnd: -30, top: -30, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,.08)" }} />
        <div style={{ position: "absolute", insetInlineEnd: 30, bottom: -50, width: 110, height: 110, borderRadius: "50%", background: "rgba(255,255,255,.07)" }} />

        <div style={{ display: "flex", gap: 14, alignItems: "flex-start", position: "relative" }}>
          <Avatar name={player.name} size={68} ring="rgba(255,255,255,.35)" />
          <div style={{ flex: 1, minWidth: 0 }}>
            {editDetails ? (
              <input value={form.name} onChange={e => setF("name", e.target.value)} style={{ ...heroInput, fontSize: 20, textAlign: "start", marginBottom: 8 }} />
            ) : (
              <h2 style={{ margin: 0, fontFamily: "Sora", fontSize: 21, fontWeight: 800, letterSpacing: "-0.01em" }}>{player.name}</h2>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
              {editDetails ? (
                <>
                  <input type="number" value={form.number} onChange={e => setF("number", e.target.value)} placeholder="#" style={{ ...heroInput, width: 56, fontSize: 14 }} />
                  <select value={form.position} onChange={e => setF("position", e.target.value)} style={{ ...heroSelect, width: 84 }}>
                    {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <select value={form.availability} onChange={e => setF("availability", e.target.value)} style={{ ...heroSelect, width: 120 }}>
                    <option value="in">{t.avail_in}</option>
                    <option value="maybe">{t.avail_maybe}</option>
                    <option value="out">{t.avail_out}</option>
                  </select>
                </>
              ) : (
                <>
                  <span style={{ background: "rgba(255,255,255,.2)", padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>#{player.number} · {player.position}</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, background: "rgba(255,255,255,.16)", padding: "3px 9px", borderRadius: 999 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: AVAIL[player.availability].color, boxShadow: "0 0 0 2px rgba(255,255,255,.4)" }} />
                    {t["avail_" + player.availability]}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Right column: edit/save controls on top, overall below */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12, flexShrink: 0 }}>
            {editDetails ? (
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setEditDetails(false)} disabled={savingDetails} style={heroBtn(false)}>{t.cancel}</button>
                <button onClick={saveDetails} disabled={savingDetails} style={heroBtn(true)}>
                  <Icon name="check" size={14} stroke={2.6} /> {savingDetails ? "…" : t.save}
                </button>
              </div>
            ) : (
              <button onClick={startEdit} style={heroBtn(false)}><Icon name="edit" size={13} stroke={2.4} /> {t.edit}</button>
            )}
            {!editDetails && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "Sora", fontWeight: 800, fontSize: 30, lineHeight: 1 }}>{ov}</div>
                <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", opacity: .85 }}>{t.overall}</div>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", marginTop: 14, background: "rgba(255,255,255,.13)", borderRadius: 14, alignItems: "flex-start" }}>
          {statBox(t.age, player.age, "", "age", true)}
          <Divider />
          {statBox(t.height, player.height_cm, "cm", "height_cm", true)}
          <Divider />
          {statBox(t.weight, player.weight_kg, "kg", "weight_kg", true)}
          <Divider />
          {/* Foot — select when editing */}
          <div style={{ flex: 1, textAlign: "center", padding: "10px 4px" }}>
            {editDetails ? (
              <select value={form.foot} onChange={e => setF("foot", e.target.value)} style={{ ...heroSelect, fontSize: 14 }}>
                {FEET.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            ) : (
              <div style={{ fontFamily: "Sora", fontWeight: 800, fontSize: 19, color: "#fff" }}>{player.foot}</div>
            )}
            <div style={{ fontSize: 10.5, opacity: .85, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em", marginTop: 6 }}>{t.foot}</div>
          </div>
        </div>
      </div>

      {/* Two-column on desktop: skills + attendance */}
      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", alignItems: "start" }}>
        {/* Skills */}
        <Card>
          <SectionLabel action={
            <button onClick={() => (editSkills ? saveSkills() : startSkills())} disabled={savingSkills} style={{
              display: "inline-flex", alignItems: "center", gap: 5, border: "1px solid " + (editSkills ? "var(--brand)" : "var(--line)"),
              background: editSkills ? "var(--brand)" : "var(--card)", color: editSkills ? "#fff" : "var(--brand)",
              padding: "5px 11px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}>
              <Icon name={editSkills ? "check" : "edit"} size={13} stroke={2.4} />{editSkills ? (savingSkills ? "…" : t.save) : t.edit}
            </button>
          }>{t.skills}</SectionLabel>

          {editSkills ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {player.skillList.map(s => (
                <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{s.label}</span>
                  <button onClick={() => bump(s.key, -1)} style={stepBtn}><Icon name="x" size={14} stroke={2.6} /></button>
                  <span style={{ fontFamily: "Sora", fontWeight: 800, fontSize: 18, color: ratingColor(skillVals[s.key]), minWidth: 30, textAlign: "center" }}>{skillVals[s.key]}</span>
                  <button onClick={() => bump(s.key, +1)} style={stepBtn}><Icon name="plus" size={14} stroke={2.6} /></button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {player.skillList.map(s => <SkillBar key={s.key} label={s.label} value={s.value} />)}
            </div>
          )}
          {editSkills && <div style={{ marginTop: 12, fontSize: 11.5, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="whistle" size={14} color="var(--brand)" /> {t.coach_view} · changes save to the player's profile
          </div>}
        </Card>

        {/* Attendance (illustrative for now) */}
        <Card>
          <SectionLabel action={<span style={{ fontFamily: "Sora", fontWeight: 800, fontSize: 15, color: "var(--brand)" }}>{Math.round((player.attendance_pct ?? 0) * 100)}%</span>}>{t.recent}</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {ATTENDANCE_LOG.map((a, i) => {
              const map = { present: ["#16A35A", "check", "Present"], late: ["#CA8A04", "clock", "Late"], absent: ["#DC2626", "x", "Absent"] };
              const [c, ic, lab] = map[a.status];
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderBottom: i < ATTENDANCE_LOG.length - 1 ? "1px solid var(--line)" : "none" }}>
                  <div style={{ width: 30, height: 30, borderRadius: 9, background: c + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon name={ic} size={15} color={c} stroke={2.6} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{a.type}</div>
                  <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>{a.date}</span>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: c, minWidth: 52, textAlign: "end" }}>{lab}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Divider() {
  return <div style={{ width: 1, alignSelf: "stretch", background: "rgba(255,255,255,.18)", margin: "8px 0" }} />;
}
function heroBtn(primary) {
  return {
    display: "inline-flex", alignItems: "center", gap: 5,
    border: "1px solid rgba(255,255,255,.4)",
    background: primary ? "rgba(255,255,255,.95)" : "rgba(255,255,255,.16)",
    color: primary ? "var(--brand-deep)" : "#fff",
    padding: "6px 11px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer",
  };
}
