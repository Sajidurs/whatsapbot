import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAnonEnv } from "@/lib/supabase-env";

// Next 16 renamed `middleware` to `proxy`; it runs on the Node.js runtime.
// This is the first gate on /dashboard — the dashboard layout and every
// /api/dashboard route check the session again, closer to the data.
export async function proxy(request: NextRequest) {
  // Reassigned by `setAll` when Supabase rotates the tokens, so whatever we
  // return at the end carries the refreshed cookies back to the browser.
  let response = NextResponse.next({ request });
  const { url, anonKey } = supabaseAnonEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        // Supabase passes no-store headers here: a cached response that sets
        // auth cookies would hand one admin's session to the next visitor.
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  if (!user && pathname.startsWith("/dashboard")) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return redirectPreservingCookies(loginUrl, response);
  }

  if (user && pathname === "/login") {
    const url = new URL("/dashboard/conversations", request.url);
    return redirectPreservingCookies(url, response);
  }

  return response;
}

/**
 * `NextResponse.redirect` starts a fresh response, which would drop any cookies
 * a token refresh just wrote — copy them over so the next request isn't forced
 * to refresh again (or worse, log the admin out).
 */
function redirectPreservingCookies(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url);
  for (const cookie of from.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }
  return redirect;
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
