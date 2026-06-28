// US-16 (#58): invite-only user provisioning.
//
// Admin/coach-only. Creates the auth user + sends the set-password email via
// auth.admin.inviteUserByEmail (one step), then records the membership
// (status='invited') and any team assignments keyed on the returned user id.
// First login flips the membership to 'active' (trigger in migration 0019).
//
// Ordering deviation from architecture §3: Supabase creates the IdP user first
// and returns its id, so the membership insert follows the invite.
import { corsHeaders } from "../_shared/cors.ts";
import { getCaller, serviceClient, callerHasRole, json } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, corsHeaders);

  const { user, error: authError } = await getCaller(req);
  if (!user) return json({ error: authError ?? "Unauthenticated" }, 401, corsHeaders);

  let body: {
    email?: string;
    name?: string;
    academy_id?: string;
    role?: string;
    team_ids?: string[];
    redirect_to?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400, corsHeaders);
  }

  const email = body.email?.trim().toLowerCase();
  const { academy_id: academyId, name, redirect_to: redirectTo } = body;
  const role = body.role ?? "player";
  const teamIds = Array.isArray(body.team_ids) ? body.team_ids : [];

  if (!email || !academyId) {
    return json({ error: "email and academy_id are required" }, 400, corsHeaders);
  }
  const validRoles = ["admin", "coach", "scout", "player"];
  if (!validRoles.includes(role)) {
    return json({ error: `role must be one of ${validRoles.join(", ")}` }, 400, corsHeaders);
  }

  const svc = serviceClient();

  // Level-2 guard (requireRole): only admin/coach may invite.
  const canInvite = await callerHasRole(svc, user.id, academyId, ["admin", "coach"]);
  if (!canInvite) {
    return json({ error: "Insufficient permission: admin or coach required" }, 403, corsHeaders);
  }
  // Only admins may mint other admins.
  if (role === "admin") {
    const callerIsAdmin = await callerHasRole(svc, user.id, academyId, ["admin"]);
    if (!callerIsAdmin) {
      return json({ error: "Only an admin can invite an admin" }, 403, corsHeaders);
    }
  }

  // 1) Create the auth user + send the invite email. If the account already
  //    exists, fall back to the mirrored profile id so re-invites are idempotent.
  let invitedUserId: string | null = null;
  const { data: invited, error: inviteError } = await svc.auth.admin.inviteUserByEmail(email, {
    data: name ? { name } : undefined,
    redirectTo,
  });

  if (inviteError) {
    const { data: existing } = await svc
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (!existing) {
      return json({ error: inviteError.message }, 409, corsHeaders);
    }
    invitedUserId = existing.id; // already invited/registered — proceed idempotently
  } else {
    invitedUserId = invited.user.id;
  }

  // 2) Record the membership without downgrading an already-active one.
  const { data: existingMembership, error: lookupError } = await svc
    .from("academy_memberships")
    .select("id, status")
    .eq("user_id", invitedUserId)
    .eq("academy_id", academyId)
    .maybeSingle();
  if (lookupError) return json({ error: lookupError.message }, 500, corsHeaders);

  let membershipId: string;
  if (existingMembership) {
    membershipId = existingMembership.id;
    const { error: updErr } = await svc
      .from("academy_memberships")
      .update({ role })
      .eq("id", membershipId);
    if (updErr) return json({ error: updErr.message }, 500, corsHeaders);
  } else {
    const { data: created, error: insErr } = await svc
      .from("academy_memberships")
      .insert({ user_id: invitedUserId, academy_id: academyId, role, status: "invited" })
      .select("id")
      .single();
    if (insErr) return json({ error: insErr.message }, 500, corsHeaders);
    membershipId = created.id;
  }

  // 3) Team assignments (idempotent).
  if (teamIds.length) {
    const rows = teamIds.map((team_id) => ({ membership_id: membershipId, team_id }));
    const { error: taErr } = await svc
      .from("team_assignments")
      .upsert(rows, { onConflict: "membership_id,team_id", ignoreDuplicates: true });
    if (taErr) return json({ error: taErr.message }, 500, corsHeaders);
  }

  return json(
    { ok: true, user_id: invitedUserId, membership_id: membershipId, reinvited: !!inviteError },
    200,
    corsHeaders,
  );
});
