import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Icon, Pill, primaryBtn } from "../ui/kit.jsx";
import { useAuth } from "../state/auth.jsx";
import { adminApi } from "../lib/admin.js";
import StateNote from "../components/StateNote.jsx";

const ROLES = ["admin", "coach", "scout", "player"];

const fieldStyle = {
  border: "1px solid var(--line)", borderRadius: 10, padding: "9px 11px",
  fontFamily: "inherit", fontSize: 13.5, color: "var(--ink)", background: "var(--card)", outline: "none",
};
const smallBtn = (variant = "ghost") => ({
  display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer",
  fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, padding: "7px 12px", borderRadius: 10,
  border: "1px solid " + (variant === "danger" ? "rgba(220,38,38,.4)" : "var(--line)"),
  background: variant === "primary" ? "var(--brand)" : "var(--card)",
  color: variant === "primary" ? "#fff" : variant === "danger" ? "#DC2626" : "var(--ink)",
});

function genPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 12; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s + "!9";
}

export default function AdminScreen() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await adminApi("list"));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  // Run a mutation, then refresh the list. Returns true on success.
  const run = useCallback(async (action, payload, okMsg) => {
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      await adminApi(action, payload);
      await load();
      if (okMsg) setFlash(okMsg);
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }, [load]);

  async function handleSignOut() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--app-bg)" }}>
      <header className="hp-header" style={{ position: "sticky", top: 0 }}>
        <div className="hp-logo" style={{ background: "var(--ink)" }}>
          <Icon name="shield" size={20} color="#fff" stroke={2} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontFamily: "Sora", fontSize: 18, fontWeight: 800, color: "var(--ink)" }}>User Management</h1>
          <div style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 600 }}>Admin · {user?.email}</div>
        </div>
        <button className="hp-iconbtn" onClick={() => navigate("/")} title="Back to app" aria-label="Back to app">
          <Icon name="chevL" size={20} color="var(--muted)" />
        </button>
        <button className="hp-iconbtn" onClick={handleSignOut} title="Sign out" aria-label="Sign out">
          <Icon name="logout" size={20} color="var(--muted)" />
        </button>
      </header>

      <div className="hp-wrap" style={{ maxWidth: 880 }}>
        {error && <StateNote tone="error">{error}</StateNote>}
        {flash && <div style={{ marginBottom: 12, fontSize: 13, fontWeight: 700, color: "var(--brand)" }}>{flash}</div>}

        <CreateUser run={run} busy={busy} />

        {loading && !data ? (
          <StateNote>Loading users…</StateNote>
        ) : data ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--muted)" }}>
              Users · {data.users.length}
            </div>
            {data.users.map((u) => (
              <UserCard key={u.id} u={u} academies={data.academies} teams={data.teams} run={run} busy={busy} isSelf={u.id === user?.id} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CreateUser({ run, busy }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState(genPassword());

  async function submit(e) {
    e.preventDefault();
    const ok = await run("create", { email, name, password }, `Created ${email} (temp password: ${password})`);
    if (ok) { setEmail(""); setName(""); setPassword(genPassword()); setOpen(false); }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{ ...primaryBtn, padding: "12px 20px" }}>
        <Icon name="plus" size={18} stroke={2.4} /> Add user
      </button>
    );
  }
  return (
    <Card pad={18}>
      <form onSubmit={submit} style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", alignItems: "end" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>Email</span>
          <input style={fieldStyle} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@academy.com" />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>Name</span>
          <input style={fieldStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>Temp password</span>
          <div style={{ display: "flex", gap: 6 }}>
            <input style={{ ...fieldStyle, flex: 1, minWidth: 0 }} required value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" onClick={() => setPassword(genPassword())} style={smallBtn()} title="Regenerate">↻</button>
          </div>
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" disabled={busy} style={{ ...primaryBtn, padding: "10px 18px", opacity: busy ? 0.7 : 1 }}>Create</button>
          <button type="button" onClick={() => setOpen(false)} style={smallBtn()}>Cancel</button>
        </div>
      </form>
    </Card>
  );
}

function UserCard({ u, academies, teams, run, busy, isSelf }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(u.name ?? "");
  const [email, setEmail] = useState(u.email ?? "");
  const deactivated = !!u.deactivated_at || u.banned;

  const assignedAcademyIds = new Set(u.memberships.map((m) => m.academy_id));
  const availableAcademies = academies.filter((a) => !assignedAcademyIds.has(a.id));

  return (
    <Card pad={16} style={deactivated ? { opacity: 0.7 } : undefined}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          {editing ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 360 }}>
              <input style={fieldStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
              <input style={fieldStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
              <div style={{ display: "flex", gap: 8 }}>
                <button disabled={busy} style={smallBtn("primary")} onClick={async () => { if (await run("update", { user_id: u.id, name, email }, "Saved")) setEditing(false); }}>Save</button>
                <button style={smallBtn()} onClick={() => { setEditing(false); setName(u.name ?? ""); setEmail(u.email ?? ""); }}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontFamily: "Sora", fontWeight: 800, fontSize: 16, color: "var(--ink)" }}>{u.name || "—"}</span>
                {deactivated
                  ? <Pill color="accent">Deactivated</Pill>
                  : <Pill color="green">Active</Pill>}
              </div>
              <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600, marginTop: 2 }}>{u.email}</div>
            </>
          )}
        </div>
        {!editing && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button style={smallBtn()} onClick={() => setEditing(true)}><Icon name="edit" size={13} stroke={2.2} /> Edit</button>
            {deactivated ? (
              <button disabled={busy} style={smallBtn("primary")} onClick={() => run("set_active", { user_id: u.id, active: true }, "Reactivated")}>Reactivate</button>
            ) : (
              <button disabled={busy || isSelf} style={smallBtn("danger")} title={isSelf ? "You can't deactivate yourself" : ""}
                onClick={() => run("set_active", { user_id: u.id, active: false }, "Deactivated")}>
                <Icon name="trash" size={13} color="#DC2626" stroke={2.2} /> Deactivate
              </button>
            )}
          </div>
        )}
      </div>

      {/* Academy memberships */}
      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        {u.memberships.map((m) => (
          <MembershipRow key={m.id} m={m} teams={teams} run={run} busy={busy} />
        ))}

        {availableAcademies.length > 0 && (
          <AssignAcademy userId={u.id} academies={availableAcademies} run={run} busy={busy} />
        )}
      </div>
    </Card>
  );
}

function MembershipRow({ m, teams, run, busy }) {
  const academyTeams = teams.filter((t) => t.academy_id === m.academy_id);
  const assignedTeamIds = new Set(m.teams.map((t) => t.team_id));
  const addableTeams = academyTeams.filter((t) => !assignedTeamIds.has(t.team_id));

  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 12, background: "var(--track)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontWeight: 700, fontSize: 13.5, color: "var(--ink)" }}>{m.academy_name}</span>
        <Pill color={m.status === "active" ? "green" : "muted"}>{m.status}</Pill>
        <select
          value={m.role} disabled={busy}
          onChange={(e) => run("set_role", { membership_id: m.id, role: e.target.value }, "Role updated")}
          style={{ ...fieldStyle, padding: "6px 8px", fontWeight: 700 }}
          aria-label="Role"
        >
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <button style={{ ...smallBtn("danger"), marginInlineStart: "auto" }} disabled={busy}
          onClick={() => run("remove_academy", { membership_id: m.id }, "Removed from academy")}>
          Remove
        </button>
      </div>

      {/* Team assignments */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--muted)" }}>Teams:</span>
        {m.teams.length === 0 && <span style={{ fontSize: 12, color: "var(--muted)" }}>none</span>}
        {m.teams.map((t) => (
          <span key={t.assignment_id} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 999, padding: "3px 6px 3px 10px", fontSize: 12, fontWeight: 700 }}>
            {t.team_name}
            <button onClick={() => run("remove_team", { assignment_id: t.assignment_id })} disabled={busy}
              style={{ border: "none", background: "none", cursor: "pointer", lineHeight: 0, padding: 2 }} aria-label={`Remove ${t.team_name}`}>
              <Icon name="x" size={13} stroke={2.4} color="var(--muted)" />
            </button>
          </span>
        ))}
        {addableTeams.length > 0 && (
          <select value="" disabled={busy} aria-label="Add team"
            onChange={(e) => { if (e.target.value) run("assign_team", { membership_id: m.id, team_id: e.target.value }, "Team assigned"); }}
            style={{ ...fieldStyle, padding: "5px 8px", fontSize: 12 }}>
            <option value="">+ Add team…</option>
            {addableTeams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
      </div>
    </div>
  );
}

function AssignAcademy({ userId, academies, run, busy }) {
  const [academyId, setAcademyId] = useState("");
  const [role, setRole] = useState("player");

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <select value={academyId} onChange={(e) => setAcademyId(e.target.value)} style={{ ...fieldStyle, padding: "7px 9px" }} aria-label="Academy">
        <option value="">Assign to academy…</option>
        {academies.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
      <select value={role} onChange={(e) => setRole(e.target.value)} style={{ ...fieldStyle, padding: "7px 9px", fontWeight: 700 }} aria-label="Role">
        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
      <button disabled={busy || !academyId} style={smallBtn("primary")}
        onClick={async () => { if (await run("assign_academy", { user_id: userId, academy_id: academyId, role }, "Assigned to academy")) setAcademyId(""); }}>
        <Icon name="plus" size={13} stroke={2.4} /> Assign
      </button>
    </div>
  );
}
