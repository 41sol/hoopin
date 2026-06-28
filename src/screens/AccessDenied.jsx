import { useNavigate } from "react-router-dom";
import { useAuth } from "../state/auth.jsx";
import { Icon, Card, primaryBtn } from "../ui/kit.jsx";
import { t } from "../data/strings.js";

/* US-13: shown for an unknown or unauthorized academy slug (and when a signed-in
   user has no academy membership at all). RLS is the real boundary — this is the
   friendly surface for the access-denied / not-found state. */
export default function AccessDenied() {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  async function handleSignOut() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "var(--app-bg)" }}>
      <Card pad={28} style={{ width: "100%", maxWidth: 400, textAlign: "center" }}>
        <div className="hp-logo" style={{ width: 52, height: 52, borderRadius: 16, margin: "0 auto 14px", background: "rgba(220,38,38,.12)" }}>
          <Icon name="x" size={26} color="#DC2626" stroke={2.2} />
        </div>
        <h1 style={{ margin: 0, fontFamily: "Sora", fontSize: 21, fontWeight: 800, color: "var(--ink)" }}>{t.access_denied}</h1>
        <p style={{ margin: "8px 0 20px", fontSize: 13.5, color: "var(--muted)", fontWeight: 600 }}>{t.access_denied_body}</p>
        <button onClick={handleSignOut} style={{ ...primaryBtn, width: "100%" }}>{t.logout}</button>
      </Card>
    </div>
  );
}
