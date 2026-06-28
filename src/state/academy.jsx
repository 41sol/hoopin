import { createContext, useContext, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAcademyBySlug, getMyAcademies, setActiveAcademy } from "../lib/api.js";
import { useAuth } from "./auth.jsx";

/* US-13: resolves the /:academySlug URL segment into an academy and scopes the
   session to it. Authorization is delegated to RLS: getAcademyBySlug only
   returns a row when the caller is an active member, so an unknown or
   unauthorized slug surfaces as `denied`. When the slug differs from the token's
   active_academy_id, we call the set-active-academy Edge Function and refresh
   the session so the JWT (and downstream RLS) follow the URL. */
const AcademyContext = createContext(null);

export function AcademyProvider({ slug, children }) {
  const { activeAcademyId } = useAuth();
  const navigate = useNavigate();
  const [academy, setAcademy] = useState(null);
  const [myAcademies, setMyAcademies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setDenied(false);
      try {
        const ac = await getAcademyBySlug(slug);
        if (!active) return;
        if (!ac) { setAcademy(null); setDenied(true); return; }
        setAcademy(ac);
        // Re-scope the token to this academy when the URL points elsewhere.
        if (activeAcademyId !== ac.id) {
          await setActiveAcademy(ac.id);
        }
        getMyAcademies().then((list) => { if (active) setMyAcademies(list); }).catch(() => {});
      } catch (e) {
        if (active) { setAcademy(null); setDenied(true); }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
    // activeAcademyId intentionally omitted: re-scoping updates it and we don't
    // want to re-run on our own refresh, only when the slug changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // Switch tenants without a manual logout: navigating remounts this provider
  // under the new slug, which re-scopes the token.
  const switchAcademy = useCallback((nextSlug) => {
    if (nextSlug && nextSlug !== slug) navigate(`/${nextSlug}/squad`);
  }, [slug, navigate]);

  // Build an absolute, academy-scoped path for navigation/links.
  const to = useCallback((path) => `/${slug}${path.startsWith("/") ? path : `/${path}`}`, [slug]);

  const value = useMemo(
    () => ({ slug, academy, myAcademies, loading, denied, switchAcademy, to }),
    [slug, academy, myAcademies, loading, denied, switchAcademy, to],
  );

  return <AcademyContext.Provider value={value}>{children}</AcademyContext.Provider>;
}

export function useAcademy() {
  const ctx = useContext(AcademyContext);
  if (!ctx) throw new Error("useAcademy must be used within AcademyProvider");
  return ctx;
}
