// Admin Dashboard backend: user management.
//
// This is a privileged, cross-tenant surface, so it runs with the service-role
// key (RLS bypassed) and is gated EXCLUSIVELY to the platform admin email. Every
// request verifies the caller JWT (getCaller) and that the caller is the admin
// before any action runs. The admin account owns that email and email is unique
// in auth.users, so the gate can't be spoofed by a user changing their own email.
//
// All reads/writes go through this single action-dispatched function rather than
// direct browser→Supabase, because the dashboard spans every academy.
import { corsHeaders } from "../_shared/cors.ts";
import { getCaller, serviceClient, json } from "../_shared/auth.ts";

const ADMIN_EMAIL = "ziad.hanna@41sol.com";
const VALID_ROLES = ["admin", "coach", "scout", "player"];
const VALID_STATUS = ["active", "invited"];
const BAN_FOREVER = "876000h"; // ~100 years

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, corsHeaders);

  // --- Authn + super-admin authz ---
  const { user, error: authError } = await getCaller(req);
  if (!user) return json({ error: authError ?? "Unauthenticated" }, 401, corsHeaders);
  if ((user.email ?? "").toLowerCase() !== ADMIN_EMAIL) {
    return json({ error: "Forbidden: admin access only" }, 403, corsHeaders);
  }

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400, corsHeaders);
  }

  const svc = serviceClient();
  const action = body.action as string;

  try {
    switch (action) {
      // ---------- READ: everything the dashboard needs ----------
      case "list": {
        const { data: authList, error } = await svc.auth.admin.listUsers({ page: 1, perPage: 1000 });
        if (error) throw error;

        const [{ data: profiles }, { data: academies }, { data: teams }, { data: memberships }, { data: assignments }] =
          await Promise.all([
            svc.from("users").select("id, email, name, deactivated_at, created_at"),
            svc.from("academies").select("id, slug, name").order("name"),
            svc.from("teams").select("id, name, academy_id").order("name"),
            svc.from("academy_memberships").select("id, user_id, academy_id, role, status, created_at"),
            svc.from("team_assignments").select("id, membership_id, team_id"),
          ]);

        const profileById = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));
        const academyById = Object.fromEntries((academies ?? []).map((a) => [a.id, a]));
        const teamById = Object.fromEntries((teams ?? []).map((t) => [t.id, t]));
        const assignByMembership: Record<string, any[]> = {};
        for (const a of assignments ?? []) (assignByMembership[a.membership_id] ??= []).push(a);
        const membByUser: Record<string, any[]> = {};
        for (const m of memberships ?? []) (membByUser[m.user_id] ??= []).push(m);

        const users = (authList.users ?? []).map((au: any) => ({
          id: au.id,
          email: au.email,
          name: profileById[au.id]?.name ?? au.user_metadata?.name ?? null,
          deactivated_at: profileById[au.id]?.deactivated_at ?? null,
          banned: !!au.banned_until && new Date(au.banned_until) > new Date(),
          created_at: au.created_at,
          memberships: (membByUser[au.id] ?? []).map((m) => ({
            id: m.id,
            academy_id: m.academy_id,
            academy_name: academyById[m.academy_id]?.name ?? null,
            role: m.role,
            status: m.status,
            teams: (assignByMembership[m.id] ?? []).map((a) => ({
              assignment_id: a.id,
              team_id: a.team_id,
              team_name: teamById[a.team_id]?.name ?? null,
            })),
          })),
        }));

        return json({ users, academies: academies ?? [], teams: teams ?? [] }, 200, corsHeaders);
      }

      // ---------- CREATE a user (temp password) ----------
      case "create": {
        const email = (body.email ?? "").trim().toLowerCase();
        const password = body.password;
        const name = body.name?.trim();
        if (!email || !password) return json({ error: "email and password are required" }, 400, corsHeaders);
        if (String(password).length < 8) return json({ error: "password must be at least 8 characters" }, 400, corsHeaders);

        const { data, error } = await svc.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: name ? { name } : undefined,
        });
        if (error) return json({ error: error.message }, 409, corsHeaders);
        return json({ ok: true, user_id: data.user.id }, 200, corsHeaders);
      }

      // ---------- UPDATE name / email ----------
      case "update": {
        const userId = body.user_id;
        if (!userId) return json({ error: "user_id is required" }, 400, corsHeaders);
        const name = body.name?.trim();
        const email = body.email?.trim().toLowerCase();

        if (email) {
          const { error } = await svc.auth.admin.updateUserById(userId, { email, email_confirm: true });
          if (error) return json({ error: error.message }, 409, corsHeaders);
        }
        const patch: Record<string, any> = {};
        if (name !== undefined) patch.name = name;
        if (email) patch.email = email;
        if (Object.keys(patch).length) {
          const { error } = await svc.from("users").update(patch).eq("id", userId);
          if (error) throw error;
        }
        return json({ ok: true }, 200, corsHeaders);
      }

      // ---------- DEACTIVATE / REACTIVATE (soft delete + ban) ----------
      case "set_active": {
        const userId = body.user_id;
        const active = body.active === true;
        if (!userId) return json({ error: "user_id is required" }, 400, corsHeaders);
        if (userId === user.id && !active) {
          return json({ error: "You can't deactivate your own admin account" }, 400, corsHeaders);
        }
        const { error: banErr } = await svc.auth.admin.updateUserById(userId, {
          ban_duration: active ? "none" : BAN_FOREVER,
        });
        if (banErr) return json({ error: banErr.message }, 500, corsHeaders);
        const { error: flagErr } = await svc
          .from("users")
          .update({ deactivated_at: active ? null : new Date().toISOString() })
          .eq("id", userId);
        if (flagErr) throw flagErr;
        return json({ ok: true, active }, 200, corsHeaders);
      }

      // ---------- ASSIGN academy (+ role + status) ----------
      case "assign_academy": {
        const userId = body.user_id;
        const academyId = body.academy_id;
        const role = body.role;
        const status = body.status ?? "active";
        if (!userId || !academyId) return json({ error: "user_id and academy_id are required" }, 400, corsHeaders);
        if (!VALID_ROLES.includes(role)) return json({ error: `role must be one of ${VALID_ROLES.join(", ")}` }, 400, corsHeaders);
        if (!VALID_STATUS.includes(status)) return json({ error: `status must be one of ${VALID_STATUS.join(", ")}` }, 400, corsHeaders);

        const { data: existing } = await svc
          .from("academy_memberships")
          .select("id")
          .eq("user_id", userId)
          .eq("academy_id", academyId)
          .maybeSingle();

        let membershipId: string;
        if (existing) {
          membershipId = existing.id;
          const { error } = await svc.from("academy_memberships").update({ role, status }).eq("id", membershipId);
          if (error) throw error;
        } else {
          const { data: created, error } = await svc
            .from("academy_memberships")
            .insert({ user_id: userId, academy_id: academyId, role, status })
            .select("id")
            .single();
          if (error) throw error;
          membershipId = created.id;
        }
        return json({ ok: true, membership_id: membershipId }, 200, corsHeaders);
      }

      // ---------- REMOVE academy membership (cascades team assignments) ----------
      case "remove_academy": {
        const membershipId = body.membership_id;
        if (!membershipId) return json({ error: "membership_id is required" }, 400, corsHeaders);
        const { error } = await svc.from("academy_memberships").delete().eq("id", membershipId);
        if (error) throw error;
        return json({ ok: true }, 200, corsHeaders);
      }

      // ---------- ROLE management ----------
      case "set_role": {
        const membershipId = body.membership_id;
        const role = body.role;
        if (!membershipId || !VALID_ROLES.includes(role)) {
          return json({ error: `membership_id and a valid role (${VALID_ROLES.join(", ")}) are required` }, 400, corsHeaders);
        }
        const { error } = await svc.from("academy_memberships").update({ role }).eq("id", membershipId);
        if (error) throw error;
        return json({ ok: true }, 200, corsHeaders);
      }

      // ---------- ASSIGN team (must belong to the membership's academy) ----------
      case "assign_team": {
        const membershipId = body.membership_id;
        const teamId = body.team_id;
        if (!membershipId || !teamId) return json({ error: "membership_id and team_id are required" }, 400, corsHeaders);

        const { data: m } = await svc.from("academy_memberships").select("academy_id").eq("id", membershipId).maybeSingle();
        if (!m) return json({ error: "Membership not found" }, 404, corsHeaders);
        const { data: tm } = await svc.from("teams").select("academy_id").eq("id", teamId).maybeSingle();
        if (!tm) return json({ error: "Team not found" }, 404, corsHeaders);
        if (tm.academy_id !== m.academy_id) {
          return json({ error: "Team is not in this membership's academy" }, 400, corsHeaders);
        }
        const { error } = await svc
          .from("team_assignments")
          .upsert({ membership_id: membershipId, team_id: teamId }, { onConflict: "membership_id,team_id", ignoreDuplicates: true });
        if (error) throw error;
        return json({ ok: true }, 200, corsHeaders);
      }

      // ---------- REMOVE team assignment ----------
      case "remove_team": {
        const assignmentId = body.assignment_id;
        if (!assignmentId) return json({ error: "assignment_id is required" }, 400, corsHeaders);
        const { error } = await svc.from("team_assignments").delete().eq("id", assignmentId);
        if (error) throw error;
        return json({ ok: true }, 200, corsHeaders);
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400, corsHeaders);
    }
  } catch (e) {
    return json({ error: (e as Error).message ?? String(e) }, 500, corsHeaders);
  }
});
