import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, Card, Icon, Pill, AvailDot, ratingColor, overall } from "../ui/kit.jsx";
import { LINES, LINE_LABEL } from "../data/static.js";
import { t } from "../data/strings.js";
import { useSquad } from "../state/squad.jsx";
import StateNote from "../components/StateNote.jsx";

const SORTS = [
  { id: "overall", label: "Overall" },
  { id: "name", label: "Name" },
];
const FILTERS = [
  { id: "all", label: "All" },
  { id: "in", label: t.avail_in },
  { id: "maybe", label: t.avail_maybe },
  { id: "out", label: t.avail_out },
];

function Chip({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      border: "1px solid " + (active ? "var(--brand)" : "var(--line)"),
      background: active ? "var(--brand-tint)" : "var(--card)",
      color: active ? "var(--brand)" : "var(--muted)",
      padding: "7px 13px", borderRadius: 999, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
    }}>{children}</button>
  );
}

export default function SquadScreen() {
  const { players, loading, error } = useSquad();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("overall");
  const [filter, setFilter] = useState("all");

  const groups = useMemo(() => {
    let list = players.filter(p => p.name.toLowerCase().includes(q.toLowerCase()));
    if (filter !== "all") list = list.filter(p => p.availability === filter);
    const sorter = sort === "name"
      ? (a, b) => a.name.localeCompare(b.name)
      : (a, b) => overall(b.skills) - overall(a.skills);
    return LINES.map(line => ({
      line,
      players: list.filter(p => p.line === line).sort(sorter),
    })).filter(g => g.players.length);
  }, [players, q, sort, filter]);

  if (loading) return <StateNote>Loading squad…</StateNote>;
  if (error) return <StateNote tone="error">Couldn't load the squad: {error}</StateNote>;

  return (
    <div>
      {/* Toolbar */}
      <div style={{
        position: "relative", marginBottom: 14, display: "flex", alignItems: "center",
        background: "var(--card)", border: "1px solid var(--line)", borderRadius: 14, padding: "0 12px",
      }}>
        <Icon name="search" size={18} color="var(--muted)" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={t.search_ph}
          style={{ border: "none", outline: "none", background: "none", flex: 1, padding: "13px 10px", fontFamily: "inherit", fontSize: 14.5, color: "var(--ink)" }} />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {FILTERS.map(f => <Chip key={f.id} active={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}</Chip>)}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".04em" }}>{t.sort}</span>
          {SORTS.map(s => <Chip key={s.id} active={sort === s.id} onClick={() => setSort(s.id)}>{s.label}</Chip>)}
        </div>
      </div>

      {groups.length === 0 && <StateNote>No players match your search.</StateNote>}

      {groups.map(({ line, players }) => (
        <section key={line} style={{ marginBottom: 24 }}>
          <h3 style={{ margin: "0 0 10px", fontSize: 12.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--muted)" }}>
            {LINE_LABEL[line]} · {players.length}
          </h3>
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
            {players.map(p => {
              const ov = overall(p.skills);
              return (
                <Card key={p.id} pad={10} onClick={() => navigate(`/squad/${p.id}`)}
                  style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                  <Avatar name={p.name} num={p.number} size={46} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
                      <Pill color="brand">{p.position}</Pill>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>
                        <AvailDot state={p.availability} />{t["avail_" + p.availability]}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: "end", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                    <span style={{ fontFamily: "Sora", fontWeight: 800, fontSize: 20, color: ratingColor(ov), lineHeight: 1 }}>{ov}</span>
                    <span style={{ fontSize: 9.5, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}>{t.overall}</span>
                  </div>
                  <Icon name="chevR" size={18} color="var(--line-strong)" style={{ marginInlineStart: -2 }} />
                </Card>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
