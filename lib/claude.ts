import Anthropic from "@anthropic-ai/sdk";
import type { Branch } from "./supabase";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const MODEL = "claude-sonnet-5";

function buildSystemPrompt(branchName: string | null) {
  return `You are the WhatsApp assistant for a clothing retailer based in Dubai, UAE.
The customer you are speaking with is closest to our ${branchName ?? "unspecified"} branch.

Rules:
- Reply in Arabic if the customer writes in Arabic, and in English if they write in English. Match their language and tone.
- Keep replies short and suitable for WhatsApp (a few sentences, no markdown headers).
- Help with product questions, sizing, stock availability, pricing, order status, and store hours/location.
- If you don't know something specific (exact stock levels, order details), say a staff member will follow up rather than guessing.
- Be warm and professional, in the style of a helpful boutique sales assistant.`;
}

export async function generateReply(
  branch: Branch | null,
  history: { direction: "inbound" | "outbound"; body: string }[]
) {
  const messages: Anthropic.MessageParam[] = history.map((m) => ({
    role: m.direction === "inbound" ? "user" : "assistant",
    content: m.body,
  }));

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 500,
    system: buildSystemPrompt(branch?.name ?? null),
    messages,
  });

  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock?.type === "text" ? textBlock.text : "";
}
