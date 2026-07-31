/**
 * The anon-key credentials shared by the browser, server and proxy clients.
 *
 * Supabase's own "URL and Key are required" error doesn't say which variables
 * this project reads, and a missing value takes out every route the proxy
 * matches — so fail with a message that names them.
 */
export function supabaseAnonEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    const missing = [
      !url && "NEXT_PUBLIC_SUPABASE_URL",
      !anonKey && "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ].filter(Boolean);
    throw new Error(
      `Missing ${missing.join(", ")}. Add ${
        missing.length > 1 ? "them" : "it"
      } to .env.local — see the "Environment variables" section of README.md.`
    );
  }

  return { url, anonKey };
}
