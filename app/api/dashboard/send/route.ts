import { NextResponse, type NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase-server";
import { supabase } from "@/lib/supabase";
import { logMessage } from "@/lib/messages";
import { sendWhatsAppText } from "@/lib/whatsapp";

const MAX_BODY_LENGTH = 4096; // WhatsApp's text message limit.

/** Sends a manual reply as the branch, bypassing Claude, and logs it. */
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: { phoneNumber?: unknown; body?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const phoneNumber = typeof payload.phoneNumber === "string" ? payload.phoneNumber.trim() : "";
  const body = typeof payload.body === "string" ? payload.body.trim() : "";

  if (!phoneNumber || !body) {
    return NextResponse.json(
      { error: "phoneNumber and body are required" },
      { status: 400 }
    );
  }
  if (body.length > MAX_BODY_LENGTH) {
    return NextResponse.json(
      { error: `Message must be ${MAX_BODY_LENGTH} characters or fewer` },
      { status: 400 }
    );
  }

  // Only ever message someone who already messaged us — this endpoint must not
  // become a way to send WhatsApp messages to arbitrary numbers.
  const { data: customer, error: lookupError } = await supabase
    .from("customers")
    .select("phone_number")
    .eq("phone_number", phoneNumber)
    .maybeSingle();

  if (lookupError) {
    return NextResponse.json({ error: lookupError.message }, { status: 500 });
  }
  if (!customer) {
    return NextResponse.json({ error: "Unknown customer" }, { status: 404 });
  }

  try {
    const waMessageId = await sendWhatsAppText(phoneNumber, body);
    await logMessage({ phoneNumber, direction: "outbound", body, waMessageId });
    return NextResponse.json({ ok: true, waMessageId });
  } catch (error) {
    console.error("Manual send failed:", error);
    const message = error instanceof Error ? error.message : "Failed to send message";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
