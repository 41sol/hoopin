import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SquadProvider } from "./state/squad.jsx";
import AppShell from "./components/AppShell.jsx";
import SquadScreen from "./screens/SquadScreen.jsx";
import AddPlayerScreen from "./screens/AddPlayerScreen.jsx";
import ProfileScreen from "./screens/ProfileScreen.jsx";
import EvaluateScreen from "./screens/EvaluateScreen.jsx";
import LineupScreen from "./screens/LineupScreen.jsx";
import JourneyScreen from "./screens/JourneyScreen.jsx";
import BoardScreen from "./screens/BoardScreen.jsx";
import Placeholder from "./screens/Placeholder.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <SquadProvider>
        <Routes>
          <Route element={<AppShell />}>
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
        </Routes>
      </SquadProvider>
    </BrowserRouter>
  );
}
