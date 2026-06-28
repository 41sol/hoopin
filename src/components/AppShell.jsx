import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Icon } from "../ui/kit.jsx";
import { t } from "../data/strings.js";
import { useSquad } from "../state/squad.jsx";
import { useAuth } from "../state/auth.jsx";
import { useAcademy } from "../state/academy.jsx";
import { isAdminEmail } from "../lib/admin.js";
import ErrorBoundary from "./ErrorBoundary.jsx";

// Paths are academy-relative (US-13); the active academy slug is prefixed below.
const TABS = [
  { path: "/squad", icon: "squad", label: t.nav_squad, title: t.squad_title },
  { path: "/evaluate", icon: "eval", label: t.nav_eval, title: t.eval_title },
  { path: "/lineup", icon: "lineup", label: t.nav_lineup, title: t.lineup_title },
  { path: "/journey", icon: "journey", label: t.nav_journey, title: t.journey_title },
  { path: "/board", icon: "board", label: t.nav_board, title: t.board_title },
];

export default function AppShell() {
  const { team } = useSquad();
  const { signOut, user } = useAuth();
  const { academy, myAcademies, switchAcademy, to } = useAcademy();
  const navigate = useNavigate();
  const isAdmin = isAdminEmail(user?.email);
  const { pathname } = useLocation();
  const active = TABS.find(tb => pathname.startsWith(to(tb.path))) || TABS[0];
  const subtitle = team ? `${team.name} · ${team.age_group}` : (academy ? academy.name : "Loading…");

  async function handleSignOut() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div className="hp-app">
      {/* Sidebar (desktop / large tablet) */}
      <aside className="hp-sidebar">
        <div className="hp-brandrow">
          <div className="hp-logo"><Icon name="football" size={22} color="#fff" stroke={2} /></div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "Sora", fontWeight: 800, fontSize: 18, letterSpacing: "-0.01em" }}>Hoopin</div>
            <div style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{subtitle}</div>
          </div>
        </div>
        {/* US-13: academy switcher — only shown to multi-academy users. */}
        {myAcademies.length > 1 && (
          <select
            className="hp-field"
            value={academy?.slug ?? ""}
            onChange={(e) => switchAcademy(e.target.value)}
            aria-label="Switch academy"
            style={{ marginBottom: 6, fontWeight: 700, fontSize: 13 }}
          >
            {myAcademies.map(a => <option key={a.id} value={a.slug}>{a.name}</option>)}
          </select>
        )}
        {TABS.map(tb => (
          <NavLink key={tb.path} to={to(tb.path)} className={({ isActive }) => "hp-navitem" + (isActive ? " active" : "")}>
            {({ isActive }) => (
              <>
                <Icon name={tb.icon} size={21} stroke={isActive ? 2.3 : 1.9} color={isActive ? "var(--brand)" : "var(--muted)"} />
                <span>{tb.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </aside>

      {/* Main column */}
      <div className="hp-main">
        <header className="hp-header">
          <div className="hp-logo hp-mobile-only"><Icon name="football" size={20} color="#fff" stroke={2} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: 0, fontFamily: "Sora", fontSize: 18, fontWeight: 800, color: "var(--ink)", letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {active.title}
            </h1>
            <div style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 600 }}>{subtitle}</div>
          </div>
          <button className="hp-iconbtn" style={{ position: "relative" }} aria-label="Notifications">
            <Icon name="bell" size={20} color="var(--muted)" />
            <span style={{ position: "absolute", top: 7, insetInlineEnd: 8, width: 7, height: 7, borderRadius: "50%", background: "var(--brand)", border: "1.5px solid var(--card)" }} />
          </button>
          {isAdmin && (
            <button className="hp-iconbtn" onClick={() => navigate("/admin")} aria-label="User management" title="User management">
              <Icon name="shield" size={20} color="var(--muted)" />
            </button>
          )}
          <button className="hp-iconbtn" onClick={handleSignOut} aria-label={t.logout} title={t.logout}>
            <Icon name="logout" size={20} color="var(--muted)" />
          </button>
        </header>

        <main className="hp-content">
          <div className="hp-wrap">
            <ErrorBoundary resetKey={pathname}><Outlet /></ErrorBoundary>
          </div>
        </main>
      </div>

      {/* Bottom nav (mobile) */}
      <nav className="hp-bottomnav">
        {TABS.map(tb => (
          <NavLink key={tb.path} to={to(tb.path)} className={({ isActive }) => "hp-tab" + (isActive ? " active" : "")}>
            {({ isActive }) => (
              <>
                {isActive && <span className="hp-tab-dot" />}
                <Icon name={tb.icon} size={23} stroke={isActive ? 2.3 : 1.9} color={isActive ? "var(--brand)" : "var(--muted)"} />
                <span>{tb.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
