import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Surfaced early so a missing .env is obvious in dev rather than a silent 401.
  console.error("Missing Supabase env vars. Copy .env.example to .env and fill in the keys.");
}

export const supabase = createClient(url, anonKey);
