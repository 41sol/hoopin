// US-13 (#55): switch the caller's active tenant.
//
// Privileged because it writes app_metadata (service role, bypasses RLS), so it
// verifies the caller JWT and confirms an ACTIVE membership in the target
// academy before pinning it. The client then calls supabase.auth.refreshSession()
// so the next JWT carries the new active_academy_id (re-running the US-12 hook).
import { corsHeaders } from "../_shared/cors.ts";
import { getCaller, serviceClient, callerHasRole, json } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, corsHeaders);

  const { user, error: authError } = await getCaller(req);
  if (!user) return json({ error: authError ?? "Unauthenticated" }, 401, corsHeaders);

  let body: { academy_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400, corsHeaders);
  }
  const academyId = body.academy_id;
  if (!academyId) return json({ error: "academy_id is required" }, 400, corsHeaders);

  const svc = serviceClient();

  // Authorize: any active role in the academy is enough to make it the active one.
  const isMember = await callerHasRole(svc, user.id, academyId, [
    "admin",
    "coach",
    "scout",
    "player",
  ]);
  if (!isMember) {
    return json({ error: "Access denied: not a member of this academy" }, 403, corsHeaders);
  }

  const { error: updateError } = await svc.auth.admin.updateUserById(user.id, {
    app_metadata: { active_academy_id: academyId },
  });
  if (updateError) return json({ error: updateError.message }, 500, corsHeaders);

  return json({ ok: true, active_academy_id: academyId }, 200, corsHeaders);
});
