import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, useParams, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./state/auth.jsx";
import { AcademyProvider, useAcademy } from "./state/academy.jsx";
import { SquadProvider } from "./state/squad.jsx";
import { getMyAcademies } from "./lib/api.js";
import AppShell from "./components/AppShell.jsx";
import LoginScreen from "./screens/LoginScreen.jsx";
import AccessDenied from "./screens/AccessDenied.jsx";
import SquadScreen from "./screens/SquadScreen.jsx";
import AddPlayerScreen from "./screens/AddPlayerScreen.jsx";
import ProfileScreen from "./screens/ProfileScreen.jsx";
import EvaluateScreen from "./screens/EvaluateScreen.jsx";
import LineupScreen from "./screens/LineupScreen.jsx";
import JourneyScreen from "./screens/JourneyScreen.jsx";
import BoardScreen from "./screens/BoardScreen.jsx";
import { t } from "./data/strings.js";

function CenterNote({ children }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontWeight: 600 }}>
      {children}
    </div>
  );
}

// US-11: gate the protected tree behind a Supabase session. Unauthenticated
// users are redirected to /login, remembering where they were headed.
function ProtectedRoute() {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return <CenterNote>{t.auth_loading}</CenterNote>;
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

// US-13: with no academy in the URL, send the user to their first academy.
function HomeRedirect() {
  const [target, setTarget] = useState(undefined); // undefined=loading, null=none
  useEffect(() => {
    let active = true;
    getMyAcademies()
      .then((list) => { if (active) setTarget(list[0]?.slug ?? null); })
      .catch(() => { if (active) setTarget(null); });
    return () => { active = false; };
  }, []);
  if (target === undefined) return <CenterNote>{t.auth_loading}</CenterNote>;
  if (target === null) return <AccessDenied />;
  return <Navigate to={`/${target}/squad`} replace />;
}

// US-13: resolve :academySlug, scope the session, and gate on membership.
function AcademyGate() {
  const { loading, denied } = useAcademy();
  if (loading) return <CenterNote>{t.auth_loading}</CenterNote>;
  if (denied) return <AccessDenied />;
  return (
    <SquadProvider>
      <AppShell />
    </SquadProvider>
  );
}

function AcademyLayout() {
  const { academySlug } = useParams();
  return (
    <AcademyProvider slug={academySlug}>
      <AcademyGate />
    </AcademyProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginScreen />} />
          <Route element={<ProtectedRoute />}>
            <Route index element={<HomeRedirect />} />
            <Route path=":academySlug" element={<AcademyLayout />}>
              <Route index element={<Navigate to="squad" replace />} />
              <Route path="squad" element={<SquadScreen />} />
              <Route path="squad/new" element={<AddPlayerScreen />} />
              <Route path="squad/:playerId" element={<ProfileScreen />} />
              <Route path="evaluate" element={<EvaluateScreen />} />
              <Route path="lineup" element={<LineupScreen />} />
              <Route path="journey" element={<JourneyScreen />} />
              <Route path="board" element={<BoardScreen />} />
              <Route path="*" element={<Navigate to="squad" replace />} />
            </Route>
            <Route path="*" element={<HomeRedirect />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
