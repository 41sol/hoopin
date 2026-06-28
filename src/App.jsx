import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./state/auth.jsx";
import { SquadProvider } from "./state/squad.jsx";
import AppShell from "./components/AppShell.jsx";
import LoginScreen from "./screens/LoginScreen.jsx";
import SquadScreen from "./screens/SquadScreen.jsx";
import AddPlayerScreen from "./screens/AddPlayerScreen.jsx";
import ProfileScreen from "./screens/ProfileScreen.jsx";
import EvaluateScreen from "./screens/EvaluateScreen.jsx";
import LineupScreen from "./screens/LineupScreen.jsx";
import JourneyScreen from "./screens/JourneyScreen.jsx";
import BoardScreen from "./screens/BoardScreen.jsx";
import Placeholder from "./screens/Placeholder.jsx";
import { t } from "./data/strings.js";

// US-11: full-screen auth loading state while the initial session resolves.
function AuthLoading() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontWeight: 600 }}>
      {t.auth_loading}
    </div>
  );
}

// US-11: gate the protected tree behind a Supabase session. Unauthenticated
// users are redirected to /login, remembering where they were headed.
function ProtectedRoute() {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return <AuthLoading />;
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

// The squad data + app chrome only mount once authenticated.
function AppLayout() {
  return (
    <SquadProvider>
      <AppShell />
    </SquadProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginScreen />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index element={<Navigate to="/squad" replace />} />
              <Route path="squad" element={<SquadScreen />} />
              <Route path="squad/new" element={<AddPlayerScreen />} />
              <Route path="squad/:playerId" element={<ProfileScreen />} />
              <Route path="evaluate" element={<EvaluateScreen />} />
              <Route path="lineup" element={<LineupScreen />} />
              <Route path="journey" element={<JourneyScreen />} />
              <Route path="board" element={<BoardScreen />} />
              <Route path="*" element={<Navigate to="/squad" replace />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
