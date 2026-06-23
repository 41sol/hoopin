import { createContext, useContext, useCallback, useEffect, useState } from "react";
import { getTeam, getPlayers } from "../lib/api.js";

/* Loads the team + squad once and shares it across the list and profile
   routes, with helpers to patch a single player in place after a save. */
const SquadContext = createContext(null);

export function SquadProvider({ children }) {
  const [team, setTeam] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tm = await getTeam();
      if (!tm) { setTeam(null); setPlayers([]); return; }
      setTeam(tm);
      setPlayers(await getPlayers(tm.id));
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const replacePlayer = useCallback((updated) => {
    setPlayers(prev => prev.map(p => (p.id === updated.id ? updated : p)));
  }, []);

  return (
    <SquadContext.Provider value={{ team, players, loading, error, reload: load, replacePlayer }}>
      {children}
    </SquadContext.Provider>
  );
}

export function useSquad() {
  const ctx = useContext(SquadContext);
  if (!ctx) throw new Error("useSquad must be used within SquadProvider");
  return ctx;
}
