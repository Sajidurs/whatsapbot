import { createClient } from "@supabase/supabase-js";

// Service-role client for server-side use only (route handlers, never the browser) —
// it bypasses RLS, which is what lets the webhook read/write customers & messages freely.
export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export type Customer = {
  phone_number: string;
  name: string | null;
  branch_id: number | null;
  state: "new" | "awaiting_branch" | "active";
  paused: boolean;
  first_seen: string;
  last_seen: string;
};

export type Branch = {
  id: number;
  name: string;
};
