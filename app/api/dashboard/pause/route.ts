import { NextResponse, type NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase-server";
import { supabase } from "@/lib/supabase";

/**
 * Flips `customers.paused` — the same flag the webhook checks before handing a
 * message to Claude. Writes go through here rather than the browser so RLS can
 * stay read-only for the anon key.
 */
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: { phoneNumber?: unknown; paused?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const phoneNumber = typeof payload.phoneNumber === "string" ? payload.phoneNumber.trim() : "";
  const paused = payload.paused;

  if (!phoneNumber || typeof paused !== "boolean") {
    return NextResponse.json(
      { error: "phoneNumber (string) and paused (boolean) are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("customers")
    .update({ paused })
    .eq("phone_number", phoneNumber)
    .select("phone_number, paused")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Unknown customer" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, paused: data.paused });
}
