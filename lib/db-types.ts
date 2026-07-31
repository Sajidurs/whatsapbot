// Row shapes for the tables in supabase/schema.sql. Kept in their own module so
// client components can import them without pulling in the service-role client.

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

export type Message = {
  id: number;
  phone_number: string;
  direction: "inbound" | "outbound";
  body: string;
  wa_message_id: string | null;
  created_at: string;
};

/** A customer row with the `branches` relation embedded by PostgREST. */
export type CustomerWithBranch = Customer & {
  branches: { name: string } | null;
};
