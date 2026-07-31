import { supabase } from "./supabase";

export type LoggedMessage = {
  direction: "inbound" | "outbound";
  body: string;
};

export async function logMessage(params: {
  phoneNumber: string;
  direction: "inbound" | "outbound";
  body: string;
  waMessageId?: string | null;
}) {
  const { error } = await supabase.from("messages").insert({
    phone_number: params.phoneNumber,
    direction: params.direction,
    body: params.body,
    wa_message_id: params.waMessageId ?? null,
  });
  if (error) throw new Error(`Failed to log message: ${error.message}`);
}

/** Most recent messages for a phone number, oldest first, for use as Claude conversation history. */
export async function getRecentHistory(
  phoneNumber: string,
  limit = 12
): Promise<LoggedMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("direction, body")
    .eq("phone_number", phoneNumber)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to load message history: ${error.message}`);
  return ((data as LoggedMessage[]) ?? []).reverse();
}
