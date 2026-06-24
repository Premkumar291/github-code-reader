/**
 * lib/groq.ts
 * Groq LLM API client for streaming chat completions.
 * Uses the OpenAI-compatible API endpoint.
 * Free tier model: llama3-70b-8192 (best quality on free tier)
 */

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
export const GROQ_MODEL = "llama-3.3-70b-versatile";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Calls Groq and returns a ReadableStream of raw SSE bytes.
 * The caller can pipe this directly to the HTTP response.
 */
export async function streamGroqCompletion(
  messages: ChatMessage[],
  temperature = 0.3
): Promise<ReadableStream<Uint8Array>> {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY environment variable is not set");
  }

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      stream: true,
      temperature,
      max_tokens: 2048,
    }),
  });

  if (!response.ok || !response.body) {
    const err = await response.text();
    throw new Error(`Groq API error: ${response.status} — ${err}`);
  }

  return response.body;
}

/**
 * Builds the RAG system prompt with retrieved code context.
 */
export function buildRAGPrompt(
  context: string,
  repoName: string
): ChatMessage {
  return {
    role: "system",
    content: `You are an expert software engineer helping a developer understand the "${repoName}" codebase.

Answer the user's question directly and explain what the code does in plain language first. Do not dump large code blocks or repeat the retrieved snippets unless they are necessary to support the explanation.

Rules:
- Focus on the specific question the user asked, not on listing every retrieved file.
- Explain the behavior, flow, or purpose of the code before quoting any snippet.
- Use short code snippets only when they clarify the explanation.
- Reference specific file paths and line ranges when relevant.
- If the retrieved context does not contain enough information, say that clearly instead of guessing.
- Keep the response concise, but make it explanatory rather than code-heavy.

Suggested response shape:
1. Direct answer in 1-3 sentences.
2. Brief explanation of how the code works.
3. Optional small snippet or file reference if needed.

Retrieved Code Context:
---
${context}
---`,
  };
}
