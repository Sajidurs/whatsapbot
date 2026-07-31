import Anthropic from "@anthropic-ai/sdk";
import type { Product } from "./db-types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const MODEL = "claude-sonnet-5";

/** Renders the products table into the `Catalog:` section of the system prompt. */
function formatCatalog(products: Product[]) {
  if (products.length === 0) {
    return "(No products are loaded. Do not quote any product or price — offer to connect the customer with the sales team instead.)";
  }

  return products
    .map((product) => {
      const parts = [`- ${product.name} — AED ${product.price}`];
      if (product.description) parts.push(product.description);
      if (!product.in_stock) parts.push("currently out of stock");
      return parts.join(" — ");
    })
    .join("\n");
}

function buildSystemPrompt(catalogText: string) {
  return `You are a helpful assistant for Trend Uniform, a school and corporate uniform supplier based in the UAE (trenduniform.ae).

Business info:
- Trend Uniform supplies uniforms for government schools, charter schools, ADNOC schools, ATS (Applied Technology School), Fatima Medical College, and private schools across the UAE. Also does corporate, medical, security, hospitality, and graduate uniforms.
- Delivery across all Emirates, 1-3 business days.
- Returns/exchange: unused items within 14 days, original packaging.
- Offers logo embroidery and bulk customization for schools/businesses.
- Prices in AED.

Language rule:
- If the customer writes in Arabic, reply only in Arabic.
- If the customer writes in English, reply only in English.
- Match their language on every message, don't mix unless they do.

Tone and style:
- Sound like a real, kind, professional human, not a script.
- Keep replies short and to the point. No long paragraphs.
- Be warm and respectful, especially since many customers are parents asking about school uniforms.
- Don't over-explain. Answer the actual question first.

Behavior:
- Help with product questions, sizing, school-specific uniforms, delivery, and returns.
- For bulk/school orders or embroidery pricing, offer to connect them with the sales team.
- Do not invent stock or prices. Use only the catalog provided below.

Catalog:
${catalogText}`;
}

export async function generateReply(
  products: Product[],
  history: { direction: "inbound" | "outbound"; body: string }[]
) {
  const messages: Anthropic.MessageParam[] = history.map((m) => ({
    role: m.direction === "inbound" ? "user" : "assistant",
    content: m.body,
  }));

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 500,
    system: buildSystemPrompt(formatCatalog(products)),
    messages,
  });

  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock?.type === "text" ? textBlock.text : "";
}
