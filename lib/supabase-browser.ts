import { createBrowserClient } from "@supabase/ssr";
import { supabaseAnonEnv } from "./supabase-env";

/**
 * Anon-key client for the browser. Reads are subject to RLS (see
 * supabase/rls.sql), so only a logged-in admin gets rows back.
 *
 * `createBrowserClient` returns a singleton in the browser, so calling this on
 * every render is cheap and keeps one shared auth state.
 */
export function supabaseBrowser() {
  const { url, anonKey } = supabaseAnonEnv();
  return createBrowserClient(url, anonKey);
}
