import { createContext, useContext, useCallback, useEffect, useState } from "react";
import { getTeam, getPlayers } from "../lib/api.js";
import { useAcademy } from "./academy.jsx";

/* Loads the team + squad once and shares it across the list and profile
   routes, with helpers to patch a single player in place after a save. Scoped
   to the active academy (US-13): reloads when the academy changes. */
const SquadContext = createContext(null);

export function SquadProvider({ children }) {
  const { academy } = useAcademy();
  const academyId = academy?.id ?? null;
  const [team, setTeam] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tm = await getTeam(academyId);
      if (!tm) { setTeam(null); setPlayers([]); return; }
      setTeam(tm);
      setPlayers(await getPlayers(tm.id));
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [academyId]);

  useEffect(() => { load(); }, [load]);

  const replacePlayer = useCallback((updated) => {
    setPlayers(prev => prev.map(p => (p.id === updated.id ? updated : p)));
  }, []);

  // Appends a newly created player to the in-memory roster (#46).
  const addPlayer = useCallback((player) => {
    setPlayers(prev => [...prev, player]);
  }, []);

  // Drops a player from the in-memory roster after a soft-delete (#47).
  const removePlayer = useCallback((id) => {
    setPlayers(prev => prev.filter(p => p.id !== id));
  }, []);

  return (
    <SquadContext.Provider value={{ team, players, loading, error, reload: load, replacePlayer, addPlayer, removePlayer }}>
      {children}
    </SquadContext.Provider>
  );
}

export function useSquad() {
  const ctx = useContext(SquadContext);
  if (!ctx) throw new Error("useSquad must be used within SquadProvider");
  return ctx;
}
