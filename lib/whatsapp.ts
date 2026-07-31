import type { Branch } from "./supabase";

const GRAPH_API_VERSION = "v21.0";

function graphUrl() {
  return `https://graph.facebook.com/${GRAPH_API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
}

async function callWhatsAppApi(payload: Record<string, unknown>) {
  const res = await fetch(graphUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`WhatsApp API error (${res.status}): ${errorBody}`);
  }

  return res.json() as Promise<{ messages?: { id: string }[] }>;
}

/** Sends a plain text message and returns the WhatsApp message id. */
export async function sendWhatsAppText(to: string, body: string) {
  const result = await callWhatsAppApi({
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body },
  });
  return result.messages?.[0]?.id ?? null;
}

/** Sends the bilingual "which branch are you closest to" interactive list. */
export async function sendBranchListMessage(to: string, branches: Branch[]) {
  const result = await callWhatsAppApi({
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "list",
      header: {
        type: "text",
        text: "أقرب فرع؟ / Nearest branch?",
      },
      body: {
        text:
          "أهلاً بك! من فضلك اختر الفرع الأقرب إليك:\n" +
          "Welcome! Please choose the branch closest to you:",
      },
      action: {
        // WhatsApp caps button text at 20 characters.
        button: "الفروع / Branches",
        sections: [
          {
            title: "الفروع / Branches",
            rows: branches.map((branch) => ({
              id: `branch_${branch.id}`,
              title: branch.name,
            })),
          },
        ],
      },
    },
  });
  return result.messages?.[0]?.id ?? null;
}
