import { supabase } from "./supabase.js";

// The single platform admin. Mirrors ADMIN_EMAIL in the admin-users Edge
// Function — both the page and the backend gate on this exact address.
export const ADMIN_EMAIL = "ziad.hanna@41sol.com";

export function isAdminEmail(email) {
  return (email ?? "").toLowerCase() === ADMIN_EMAIL;
}

// Single entry point to the privileged admin-users Edge Function. Surfaces the
// function's JSON { error } message on non-2xx responses.
export async function adminApi(action, payload = {}) {
  const { data, error } = await supabase.functions.invoke("admin-users", {
    body: { action, ...payload },
  });
  if (error) {
    let message = error.message;
    try {
      const ctx = await error.context?.json?.();
      if (ctx?.error) message = ctx.error;
    } catch {
      /* keep the generic message */
    }
    throw new Error(message || "Admin request failed");
  }
  if (data?.error) throw new Error(data.error);
  return data;
}
