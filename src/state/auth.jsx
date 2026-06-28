import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";

/* US-11: the thin, swappable auth abstraction for the app. Everything provider-
   specific (Supabase Auth / GoTrue) is isolated here, so the rest of the app
   only sees session/user + signIn/signOut. Subscribes to onAuthStateChange so
   the tree re-renders on login, logout, and token refresh (the latter matters
   for the academy switch in US-13). */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = {
    session,
    user: session?.user ?? null,
    // active_academy_id is promoted into the JWT by the access-token hook (US-12).
    activeAcademyId: session?.user?.app_metadata?.active_academy_id ?? null,
    loading,
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    signOut: () => supabase.auth.signOut(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
