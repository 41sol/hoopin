// US-14 (#56): the privileged-operations pattern for Edge Functions.
//
// Normal reads/writes go browser -> Supabase directly under RLS (the helpers in
// migration 0016). Only privileged / cross-tenant actions (invite a user #58,
// switch active academy #55) run here with the service-role key, which BYPASSES
// RLS — so every such function must (1) verify the caller's JWT and (2) enforce
// a role/membership check before acting. These helpers centralize that contract.

import {
  createClient,
  type SupabaseClient,
  type User,
} from "https://esm.sh/@supabase/supabase-js@2";

// Service-role client: full access, RLS bypassed. Never expose to the browser.
export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

// Verifies the bearer token on the request and returns the authenticated user,
// or an error string. This is the Edge-Function equivalent of validateJwt +
// hydrateSecurityContext: Supabase verifies the signature/expiry server-side.
export async function getCaller(
  req: Request,
): Promise<{ user: User | null; error: string | null }> {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return { user: null, error: "Missing bearer token" };

  const svc = serviceClient();
  const { data, error } = await svc.auth.getUser(token);
  if (error || !data.user) return { user: null, error: "Invalid or expired token" };
  return { user: data.user, error: null };
}

// Level-2 role guard (requireRole), evaluated with the service client so it is
// authoritative regardless of RLS. Returns true if the user holds one of
// `roles` via an ACTIVE membership in `academyId`.
export async function callerHasRole(
  svc: SupabaseClient,
  userId: string,
  academyId: string,
  roles: string[],
): Promise<boolean> {
  const { data, error } = await svc
    .from("academy_memberships")
    .select("id")
    .eq("user_id", userId)
    .eq("academy_id", academyId)
    .eq("status", "active")
    .in("role", roles)
    .limit(1);
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export function json(body: unknown, status = 200, extra: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...extra },
  });
}
