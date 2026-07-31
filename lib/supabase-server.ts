import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAnonEnv } from "./supabase-env";

/**
 * Anon-key client bound to the request's cookies. Use this to find out *who* is
 * calling a route handler or server component — never for privileged writes
 * (that's what the service-role client in lib/supabase.ts is for).
 *
 * A new client per request is required; never share one across requests.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = supabaseAnonEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server components can't set cookies. proxy.ts refreshes the
          // session on every request, so it's safe to swallow this.
        }
      },
    },
  });
}

/**
 * The logged-in admin, verified against the Supabase auth server, or null.
 * Route handlers should treat null as a 401.
 */
export async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
