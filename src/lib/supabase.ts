import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True when the Supabase env vars are present. Without them the app runs in
 *  "on this device" mode, storing everything in localStorage. */
export const supabaseConfigured = Boolean(url && key);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!supabaseConfigured || typeof window === "undefined") return null;
  if (!client) client = createBrowserClient(url as string, key as string);
  return client;
}
