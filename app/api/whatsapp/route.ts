import { NextRequest, NextResponse } from "next/server";
import { getOrCreateCustomer, setCustomerBranch, setCustomerState } from "@/lib/customers";
import { logMessage, getRecentHistory } from "@/lib/messages";
import { getBranches } from "@/lib/branches";
import { sendBranchListMessage, sendWhatsAppText } from "@/lib/whatsapp";
import { generateReply } from "@/lib/claude";

// Meta calls this once, at setup time, to prove we control this endpoint.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

type IncomingWhatsAppMessage = {
  from: string;
  id: string;
  type: string;
  text?: { body: string };
  interactive?: {
    type: string;
    list_reply?: { id: string; title: string };
    button_reply?: { id: string; title: string };
  };
};

export async function POST(request: NextRequest) {
  const payload = await request.json();
  console.log("WhatsApp webhook payload:", JSON.stringify(payload, null, 2));

  const value = payload?.entry?.[0]?.changes?.[0]?.value;
  const messages: IncomingWhatsAppMessage[] | undefined = value?.messages;

  // Meta also posts delivery/read status updates through this same webhook — ignore those.
  if (!messages || messages.length === 0) {
    return NextResponse.json({ ok: true });
  }

  const contactName: string | null = value?.contacts?.[0]?.profile?.name ?? null;

  for (const message of messages) {
    await handleIncomingMessage(message, contactName);
  }

  return NextResponse.json({ ok: true });
}

async function handleIncomingMessage(
  message: IncomingWhatsAppMessage,
  contactName: string | null
) {
  const phoneNumber = message.from;
  const customer = await getOrCreateCustomer(phoneNumber, contactName);

  await logMessage({
    phoneNumber,
    direction: "inbound",
    body: extractBody(message),
    waMessageId: message.id,
  });

  // A human has taken over this conversation — the bot stays silent either way.
  if (customer.paused) return;

  const isListReply = message.type === "interactive" && message.interactive?.type === "list_reply";
  console.log("message.type:", message.type, "isListReply:", isListReply, "interactive:", message.interactive);

  if (isListReply && message.interactive?.list_reply?.id?.startsWith("branch_")) {
    const listReplyId = message.interactive.list_reply.id;
    const branchId = Number(listReplyId.slice("branch_".length));
    if (Number.isFinite(branchId)) {
      await setCustomerBranch(phoneNumber, branchId);
      await replyAndLog(
        phoneNumber,
        "تم اختيار الفرع بنجاح، كيف يمكننا مساعدتك؟\n" +
          "Branch saved! How can we help you today?"
      );
      return;
    }
  }

  // No branch on file yet: (re)send the branch picker instead of going to Claude.
  if (!customer.branch_id) {
    const branches = await getBranches();
    const waId = await sendBranchListMessage(phoneNumber, branches);
    await logMessage({
      phoneNumber,
      direction: "outbound",
      body: "[branch selection list sent]",
      waMessageId: waId,
    });
    if (customer.state === "new") {
      await setCustomerState(phoneNumber, "awaiting_branch");
    }
    return;
  }

  const branches = await getBranches();
  const branch = branches.find((b) => b.id === customer.branch_id) ?? null;
  const history = await getRecentHistory(phoneNumber);
  const reply = await generateReply(branch, history);
  await replyAndLog(phoneNumber, reply);
}

async function replyAndLog(phoneNumber: string, body: string) {
  const waId = await sendWhatsAppText(phoneNumber, body);
  await logMessage({ phoneNumber, direction: "outbound", body, waMessageId: waId });
}

function extractBody(message: IncomingWhatsAppMessage): string {
  if (message.type === "text" && message.text) return message.text.body;
  if (message.interactive?.list_reply) {
    return `[list_reply] ${message.interactive.list_reply.title}`;
  }
  if (message.interactive?.button_reply) {
    return `[button_reply] ${message.interactive.button_reply.title}`;
  }
  return `[unsupported message type: ${message.type}]`;
}
