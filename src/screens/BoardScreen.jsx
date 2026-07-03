import { useEffect, useMemo, useState } from "react";
import { Avatar, Card, Icon, Pill, primaryBtn } from "../ui/kit.jsx";
import { t } from "../data/strings.js";
import { useSquad } from "../state/squad.jsx";
import { getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement, setRsvp } from "../lib/api.js";
import StateNote from "../components/StateNote.jsx";

// No auth yet: the RSVP buttons act as a fixed player persona, and authoring
// happens as the coach.
const ME_NUMBER = 10;
const COACH = { author_name: "Coach Walid", author_role: "Head Coach" };

function relativeTime(iso) {
  const d = new Date(iso), s = (Date.now() - d.getTime()) / 1000;
  if (s < 3600) return Math.max(1, Math.round(s / 60)) + "m ago";
  if (s < 86400) return Math.round(s / 3600) + "h ago";
  const days = Math.round(s / 86400);
  if (days === 1) return "Yesterday";
  if (days < 7) return days + " days ago";
  return d.toLocaleDateString();
}

export default function BoardScreen() {
  const { team, players, loading, error } = useSquad();
  const [items, setItems] = useState(null);
  const [loadErr, setLoadErr] = useState(null);
  const [editing, setEditing] = useState(null); // 'new' | announcement | null

  const me = useMemo(() => players.find(p => p.number === ME_NUMBER) || players[0], [players]);

  const load = () => {
    if (!team?.id) return;
    getAnnouncements(team.id).then(setItems).catch(e => setLoadErr(e.message || String(e)));
  };
  useEffect(load, [team?.id]);

  if (loading || (!items && !loadErr && !error)) return <StateNote>Loading board…</StateNote>;
  if (error) return <StateNote tone="error">Couldn't load the team: {error}</StateNote>;
  if (loadErr) return <StateNote tone="error">Couldn't load announcements: {loadErr}</StateNote>;

  const onRsvp = async (item, choice) => {
    const current = item.rsvps.find(r => r.player_id === me.id)?.status || null;
    const next = current === choice ? null : choice;
    try {
      const updated = await setRsvp(item.id, me.id, next);
      setItems(list => list.map(a => (a.id === item.id ? updated : a)));
    } catch (e) { alert("Couldn't save RSVP: " + (e.message || e)); }
  };

  const onDelete = async (item) => {
    if (!window.confirm(t.confirm_delete)) return;
    try { await deleteAnnouncement(item.id); setItems(list => list.filter(a => a.id !== item.id)); }
    catch (e) { alert("Couldn't delete: " + (e.message || e)); }
  };

  const onSubmit = async (form) => {
    try {
      if (editing === "new") {
        await createAnnouncement({ team_id: team.id, ...COACH, ...form });
      } else {
        await updateAnnouncement(editing.id, form);
      }
      setEditing(null);
      load();
    } catch (e) { alert("Couldn't save announcement: " + (e.message || e)); }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
        <button onClick={() => setEditing("new")} style={{ ...primaryBtn, padding: "11px 18px", fontSize: 14 }}>
          <Icon name="plus" size={17} stroke={2.4} /> {t.new_announcement}
        </button>
      </div>

      {items.length === 0 && <StateNote>{t.no_announcements}</StateNote>}

      <div className="board-grid">
        {items.map(a => (
          <AnnouncementCard key={a.id} a={a} meId={me?.id}
            onRsvp={onRsvp} onEdit={() => setEditing(a)} onDelete={() => onDelete(a)} />
        ))}
      </div>

      {editing && (
        <AnnouncementForm
          initial={editing === "new" ? null : editing}
          onCancel={() => setEditing(null)}
          onSubmit={onSubmit}
        />
      )}
    </div>
  );
}

function AnnouncementCard({ a, meId, onRsvp, onEdit, onDelete }) {
  const mine = a.rsvps.find(r => r.player_id === meId)?.status || null;
  const total = a.tally.in + a.tally.maybe + a.tally.out;
  const seg = (c, v) => <div style={{ width: (total ? v / total * 100 : 0) + "%", background: c, height: "100%" }} />;

  return (
    <Card pad={0} style={{ overflow: "hidden", borderColor: a.pinned ? "var(--brand)" : "var(--line)", alignSelf: "start" }}>
      {a.pinned && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--brand-tint)", color: "var(--brand)", padding: "6px 16px", fontSize: 11.5, fontWeight: 700 }}>
          <Icon name="pin" size={13} stroke={2.2} /> {t.pinned}
        </div>
      )}
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <Avatar name={a.author_name} size={40} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{a.author_name}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>{a.author_role} · {relativeTime(a.created_at)}</div>
          </div>
          {a.tag && <Pill color={a.tag_color}>{a.tag}</Pill>}
          <div style={{ display: "flex", gap: 2 }}>
            <button onClick={onEdit} className="hp-iconbtn" style={{ width: 30, height: 30 }} aria-label="Edit"><Icon name="edit" size={15} color="var(--muted)" /></button>
            <button onClick={onDelete} className="hp-iconbtn" style={{ width: 30, height: 30 }} aria-label="Delete"><Icon name="trash" size={15} color="var(--muted)" /></button>
          </div>
        </div>

        <h3 style={{ margin: "0 0 6px", fontFamily: "Sora", fontSize: 16.5, fontWeight: 700, color: "var(--ink)", lineHeight: 1.25 }}>{a.title}</h3>
        {a.body && <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: "var(--muted)" }}>{a.body}</p>}

        {a.has_rsvp && (
          <div style={{ marginTop: 14 }}>
            {a.deadline && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 600, color: "var(--muted)", marginBottom: 10 }}>
                <Icon name="clock" size={13} /> {a.deadline}
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <RsvpBtn active={mine === "in"} color="#16A35A" icon="check" label={t.going} onClick={() => onRsvp(a, "in")} />
              <RsvpBtn active={mine === "maybe"} color="#CA8A04" icon="clock" label={t.maybe} onClick={() => onRsvp(a, "maybe")} />
              <RsvpBtn active={mine === "out"} color="#DC2626" icon="x" label={t.cant} onClick={() => onRsvp(a, "out")} />
            </div>

            <div style={{ marginTop: 12, padding: "12px 14px", background: "var(--track)", borderRadius: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--muted)" }}>
                  <Icon name="whistle" size={13} color="var(--brand)" /> {t.coach_view}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>{total} {t.responses}</span>
              </div>
              <div style={{ display: "flex", height: 8, borderRadius: 6, overflow: "hidden", background: "var(--line)" }}>
                {seg("#16A35A", a.tally.in)}{seg("#CA8A04", a.tally.maybe)}{seg("#DC2626", a.tally.out)}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
                <Tally color="#16A35A" n={a.tally.in} label={t.attending} />
                <Tally color="#CA8A04" n={a.tally.maybe} label={t.maybe} />
                <Tally color="#DC2626" n={a.tally.out} label={t.absent} />
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

function RsvpBtn({ active, color, icon, label, onClick }) {
  return (
    <button onClick={onClick} aria-pressed={active} style={{
      flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "10px 4px",
      borderRadius: 14, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700,
      border: "1.5px solid " + (active ? color : "var(--line)"),
      background: active ? color : "var(--card)", color: active ? "#fff" : "var(--muted)", transition: "all .15s",
    }}>
      <Icon name={icon} size={18} stroke={2.6} />{label}
    </button>
  );
}

function Tally({ color, n, label }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
      <span style={{ fontFamily: "Sora", fontWeight: 800, fontSize: 19, color }}>{n}</span>
      <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--muted)" }}>{label}</span>
    </div>
  );
}

const TAG_COLORS = [
  { value: "accent", label: "Orange" }, { value: "blue", label: "Blue" },
  { value: "green", label: "Green" }, { value: "brand", label: "Brand" }, { value: "muted", label: "Grey" },
];

function AnnouncementForm({ initial, onCancel, onSubmit }) {
  const [f, setF] = useState(() => ({
    title: initial?.title || "", body: initial?.body || "", tag: initial?.tag || "",
    tag_color: initial?.tag_color || "accent", deadline: initial?.deadline || "",
    pinned: initial?.pinned ?? false, has_rsvp: initial?.has_rsvp ?? true,
  }));
  const set = (k, v) => setF(s => ({ ...s, [k]: v }));
  const [saving, setSaving] = useState(false);
  const valid = f.title.trim().length > 0;

  const submit = async () => {
    if (!valid) return;
    setSaving(true);
    await onSubmit({
      title: f.title.trim(), body: f.body.trim() || null, tag: f.tag.trim() || null,
      tag_color: f.tag_color, deadline: f.has_rsvp ? (f.deadline.trim() || null) : null,
      pinned: f.pinned, has_rsvp: f.has_rsvp,
    });
    setSaving(false);
  };

  const label = (s) => <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>{s}</span>;

  return (
    <div className="hp-modal-overlay" onClick={onCancel}>
      <div className="hp-modal" onClick={e => e.stopPropagation()}>
        <h2 style={{ margin: "0 0 16px", fontFamily: "Sora", fontSize: 19, fontWeight: 800, color: "var(--ink)" }}>
          {initial ? t.edit : t.new_announcement}
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>{label(t.ann_title)}
            <input className="hp-field" value={f.title} onChange={e => set("title", e.target.value)} placeholder="Match call-up…" />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>{label(t.ann_body)}
            <textarea className="hp-field" rows={4} style={{ resize: "none" }} value={f.body} onChange={e => set("body", e.target.value)} />
          </label>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 6, flex: "1 1 140px" }}>{label(t.ann_tag)}
              <input className="hp-field" value={f.tag} onChange={e => set("tag", e.target.value)} placeholder="Schedule" />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6, flex: "1 1 120px" }}>{label(t.ann_color)}
              <select className="hp-field" value={f.tag_color} onChange={e => set("tag_color", e.target.value)}>
                {TAG_COLORS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </label>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <input type="checkbox" checked={f.has_rsvp} onChange={e => set("has_rsvp", e.target.checked)} />
            {label(t.ann_rsvp)}
          </label>
          {f.has_rsvp && (
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>{label(t.ann_deadline)}
              <input className="hp-field" value={f.deadline} onChange={e => set("deadline", e.target.value)} placeholder="RSVP by Fri 18:00" />
            </label>
          )}
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <input type="checkbox" checked={f.pinned} onChange={e => set("pinned", e.target.checked)} />
            {label(t.ann_pinned)}
          </label>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
          <button onClick={onCancel} style={{ border: "1px solid var(--line)", background: "var(--card)", color: "var(--ink)", borderRadius: 12, padding: "11px 18px", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>{t.cancel}</button>
          <button onClick={submit} disabled={!valid || saving} style={{ ...primaryBtn, padding: "11px 20px", fontSize: 14, opacity: valid ? 1 : .5 }}>
            {saving ? "…" : (initial ? t.save_changes : t.post)}
          </button>
        </div>
      </div>
    </div>
  );
}
