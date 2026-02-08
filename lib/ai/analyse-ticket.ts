import Anthropic from "@anthropic-ai/sdk";
import { TICKET_ANALYSIS_SYSTEM_PROMPT } from "./system-prompt";

export interface TicketAnalysis {
  summary: string;
  affectedAreas: string[];
  implementation: { step: number; description: string; file?: string }[];
}

export async function analyseTicket(ticket: {
  request_type: string;
  details: string;
  screen_path: string | null;
  attachments?: { fileName: string; content: string }[];
}): Promise<TicketAnalysis> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const parts = [
    `Type: ${ticket.request_type}`,
    ticket.screen_path ? `Screen: ${ticket.screen_path}` : null,
    `Details: ${ticket.details}`,
  ].filter(Boolean);

  if (ticket.attachments?.length) {
    parts.push("", "--- Attached Files ---");
    for (const att of ticket.attachments) {
      parts.push(`[${att.fileName}]:`, att.content, "");
    }
  }

  const userMessage = parts.join("\n");

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: TICKET_ANALYSIS_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Strip possible code fences
  const cleaned = text.replace(/^```(?:json)?\s*\n?/m, "").replace(/\n?```\s*$/m, "");

  const parsed: TicketAnalysis = JSON.parse(cleaned);
  return parsed;
}
