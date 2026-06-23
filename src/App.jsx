import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SquadProvider } from "./state/squad.jsx";
import AppShell from "./components/AppShell.jsx";
import SquadScreen from "./screens/SquadScreen.jsx";
import ProfileScreen from "./screens/ProfileScreen.jsx";
import Placeholder from "./screens/Placeholder.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <SquadProvider>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/squad" replace />} />
            <Route path="squad" element={<SquadScreen />} />
            <Route path="squad/:playerId" element={<ProfileScreen />} />
            <Route path="evaluate" element={<Placeholder title="Session Evaluation" icon="eval" step="Screen 2" />} />
            <Route path="lineup" element={<Placeholder title="Match Lineup" icon="lineup" step="Screen 3" />} />
            <Route path="journey" element={<Placeholder title="My Journey" icon="journey" step="Screen 4" />} />
            <Route path="board" element={<Placeholder title="Announcements" icon="board" step="Screen 5" />} />
            <Route path="*" element={<Navigate to="/squad" replace />} />
          </Route>
        </Routes>
      </SquadProvider>
    </BrowserRouter>
  );
}
