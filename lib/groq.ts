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

You have been provided with relevant code snippets retrieved from the repository. Use them to answer the user's question accurately.

Guidelines:
- Reference specific file paths when explaining code (e.g., "In \`src/auth/jwt.ts\`...")
- If the code context is insufficient, say so honestly rather than guessing
- Keep answers concise but complete
- Use markdown formatting with code blocks for code examples
- Point out line numbers when referencing specific parts (e.g., "line 42-78")

Retrieved Code Context:
---
${context}
---`,
  };
}
