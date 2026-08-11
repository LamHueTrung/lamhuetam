import { ChatMessage } from "./_db";
import fetch from "node-fetch";
import { Handler } from "@netlify/functions";

// ---------------------------------------------------------------------------
// Utility: compress an array of messages (same logic as in gemini-advisor)
// ---------------------------------------------------------------------------
function compressMessages(messages: any[]): { role: string; content: string }[] {
  return messages
    .slice(-6) // keep last 6 messages only
    .map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content:
        String(m.content).length > 120
          ? String(m.content).slice(0, 117) + "..."
          : String(m.content),
    }));
}

// ---------------------------------------------------------------------------
// CRUD helpers for chat messages (session based on ISO date string "YYYY-MM-DD")
// ---------------------------------------------------------------------------
/**
 * Save a new chat message to the DB.
 */
export async function addMessage(params: {
  role: "user" | "assistant";
  content: string;
  sessionDate: string; // e.g. "2024-10-31"
}): Promise<void> {
  const { role, content, sessionDate } = params;
  await ChatMessage.create({ role, content, sessionDate });
}

/**
 * Retrieve the most recent messages for a given session (or all sessions if omitted).
 * Returns raw documents – callers can compress with `compressMessages`.
 */
export async function getRecentMessages(options: {
  sessionDate?: string;
  limit?: number;
} = {}): Promise<any[]> {
  const { sessionDate, limit = 20 } = options;
  const query: any = {};
  if (sessionDate) query.sessionDate = sessionDate;
  const msgs = await ChatMessage.find(query)
    .sort({ _id: -1 }) // newest first
    .limit(limit)
    .lean();
  return msgs.reverse(); // chronological order
}

/**
 * Generate a short session summary (max 300 chars) using the same LLM endpoint.
 * The summary is stored back to the DB as a separate collection – here we reuse
 * the `ChatMessage` collection with a special `role: "summary"` entry.
 */
export async function summarizeSession(params: {
  sessionDate: string;
  messages: any[]; // raw messages for the session
  apiKey: string;
  baseUrl: string;
  model: string;
}): Promise<string> {
  const { sessionDate, messages, apiKey, baseUrl, model } = params;
  const compressed = compressMessages(messages);
  const prompt = `Tóm tắt ngắn gọn (≤300 ký tự) nội dung chat của phiên ngày ${sessionDate}. Không cần chi tiết, chỉ nêu các chủ đề chính, quyết định người dùng đưa ra và bất kỳ insight nào xuất hiện.`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300000);
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: prompt }, ...compressed],
        temperature: 0.2,
        max_tokens: 200,
      }),
      signal: controller.signal as any,
    });
    const data: any = await res.json();
    let summary = data.choices?.[0]?.message?.content?.trim() ?? "";
    if (!summary) {
      summary = "Không có tóm tắt cho phiên làm việc này.";
    }
    // store summary for later retrieval
    await ChatMessage.create({ role: "summary", content: summary, sessionDate });
    return summary;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ---------------------------------------------------------------------------
// Netlify handler (optional) – expose a tiny API to fetch compressed history.
// ---------------------------------------------------------------------------
export const handler: Handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Content-Type": "application/json",
  };
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  const { sessionDate } = event.queryStringParameters || {};
  try {
    const { connectDB } = require("./_db");
    await connectDB();
    if (event.httpMethod === "GET") {
      const msgs = await getRecentMessages({ sessionDate, limit: 30 });
      return { statusCode: 200, headers, body: JSON.stringify({ messages: compressMessages(msgs) }) };
    }
    if (event.httpMethod === "DELETE") {
      if (sessionDate) {
        await ChatMessage.deleteMany({ sessionDate });
      } else {
        await ChatMessage.deleteMany({});
      }
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  } catch (e: any) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
