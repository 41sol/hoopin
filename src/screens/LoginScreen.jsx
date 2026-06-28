import { useState } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "../state/auth.jsx";
import { Icon, Card, primaryBtn } from "../ui/kit.jsx";
import { t } from "../data/strings.js";

/* US-11: in-app email/password login (Supabase has no hosted Universal Login).
   Branded to match the app shell: green brand mark, Sora headings, .hp-field
   inputs, primaryBtn. Invite-only — there is deliberately no sign-up link. */
export default function LoginScreen() {
  const { session, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  // Where to land after login: bounce back to the page the user was sent from.
  const from = location.state?.from?.pathname || "/";

  if (session) return <Navigate to={from} replace />;

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error: signInError } = await signIn(email.trim(), password);
    setBusy(false);
    if (signInError) {
      setError(signInError.message || t.login_failed);
      return;
    }
    navigate(from, { replace: true });
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16, background: "var(--app-bg)",
    }}>
      <Card pad={28} style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginBottom: 22 }}>
          <div className="hp-logo" style={{ width: 52, height: 52, borderRadius: 16 }}>
            <Icon name="football" size={28} color="#fff" stroke={2} />
          </div>
          <div style={{ textAlign: "center" }}>
            <h1 style={{ margin: 0, fontFamily: "Sora", fontSize: 22, fontWeight: 800, letterSpacing: "-0.01em", color: "var(--ink)" }}>
              {t.login_title}
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 13.5, color: "var(--muted)", fontWeight: 600 }}>
              {t.login_subtitle}
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--muted)" }}>{t.login_email}</span>
            <input
              className="hp-field" type="email" autoComplete="email" required
              value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.login_email_ph}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--muted)" }}>{t.login_password}</span>
            <input
              className="hp-field" type="password" autoComplete="current-password" required
              value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t.login_password_ph}
            />
          </label>

          {error && (
            <div role="alert" style={{
              fontSize: 13, fontWeight: 600, color: "#DC2626",
              background: "rgba(220,38,38,.10)", border: "1px solid rgba(220,38,38,.25)",
              borderRadius: 12, padding: "10px 12px",
            }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={busy} style={{ ...primaryBtn, width: "100%", opacity: busy ? 0.7 : 1, marginTop: 2 }}>
            {busy ? t.login_busy : t.login_submit}
          </button>
        </form>

        <p style={{ margin: "18px 0 0", textAlign: "center", fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>
          {t.login_invite_note}
        </p>
      </Card>
    </div>
  );
}
