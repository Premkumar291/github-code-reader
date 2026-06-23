/**
 * app/api/chat/route.ts
 * POST /api/chat
 *
 * RAG chat pipeline:
 * 1. Authenticate user
 * 2. Embed the user's question via HF
 * 3. Query Pinecone for top-6 similar code chunks
 * 4. Build prompt with context
 * 5. Stream Groq response back as SSE
 * 6. Persist messages to DB
 */
import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifyJWT, TOKEN_COOKIE_NAME } from "@/lib/auth";
import { query } from "@/lib/db";
import { embedText } from "@/lib/embeddings";
import { queryVectors } from "@/lib/pinecone";
import { streamGroqCompletion, buildRAGPrompt } from "@/lib/groq";

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  // SSE helper
  const sseEvent = (data: Record<string, unknown>) =>
    encoder.encode(`data: ${JSON.stringify(data)}\n\n`);

  const stream = new ReadableStream({
    async start(controller) {
      let assistantContent = "";
      let retrievedChunks: unknown[] = [];

      try {
        // ── Auth ──────────────────────────────────────────────────────────────
        const cookieStore = await cookies();
        const token = cookieStore.get(TOKEN_COOKIE_NAME)?.value;
        if (!token) {
          controller.enqueue(sseEvent({ type: "error", message: "Not authenticated" }));
          controller.close();
          return;
        }

        const payload = await verifyJWT(token);
        if (!payload) {
          controller.enqueue(sseEvent({ type: "error", message: "Invalid token" }));
          controller.close();
          return;
        }

        const body = await request.json();
        const { repo_id, message, session_id } = body;

        if (!repo_id || !message) {
          controller.enqueue(sseEvent({ type: "error", message: "repo_id and message are required" }));
          controller.close();
          return;
        }

        if (typeof message !== "string" || message.length > 4000) {
          controller.enqueue(sseEvent({ type: "error", message: "Message must be a string under 4000 characters" }));
          controller.close();
          return;
        }

        // Verify user owns this repo
        const repos = await query<{ id: number; repo_name: string; owner: string }>(
          "SELECT id, repo_name, owner FROM repos WHERE id = $1 AND user_id = $2 AND status = 'ready'",
          [repo_id, payload.id]
        );

        if (repos.length === 0) {
          controller.enqueue(sseEvent({ type: "error", message: "Repo not found or not yet indexed" }));
          controller.close();
          return;
        }

        const repo = repos[0];
        const repoName = `${repo.owner}/${repo.repo_name}`;

        // ── Get or create chat session ─────────────────────────────────────────
        let sessionId = session_id;
        if (!sessionId) {
          const sessions = await query<{ id: number }>(
            `INSERT INTO chat_sessions (user_id, repo_id, title)
             VALUES ($1, $2, $3) RETURNING id`,
            [payload.id, repo_id, message.slice(0, 100)]
          );
          sessionId = sessions[0].id;
        }

        // Save user message
        await query(
          "INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3)",
          [sessionId, "user", message]
        );

        controller.enqueue(sseEvent({ type: "session_id", session_id: sessionId }));

        // ── Embed the question ─────────────────────────────────────────────────
        controller.enqueue(sseEvent({ type: "thinking", message: "Searching codebase..." }));

        const queryEmbedding = await embedText(message);

        // ── Search Pinecone ────────────────────────────────────────────────────
        const matches = await queryVectors(queryEmbedding, repo_id, 6);

        retrievedChunks = matches.map((m) => ({
          file: m.metadata.filePath,
          lineStart: m.metadata.lineStart,
          lineEnd: m.metadata.lineEnd,
          score: m.score,
        }));

        // Format context for the prompt
        const context = matches
          .map(
            (m) =>
              `### ${m.metadata.filePath} (lines ${m.metadata.lineStart + 1}–${m.metadata.lineEnd + 1})\n` +
              "```" +
              m.metadata.language +
              "\n" +
              m.metadata.text +
              "\n```"
          )
          .join("\n\n");

        // ── Stream Groq ────────────────────────────────────────────────────────
        controller.enqueue(sseEvent({ type: "sources", sources: retrievedChunks }));

        const systemPrompt = buildRAGPrompt(context, repoName);
        const groqStream = await streamGroqCompletion([
          systemPrompt,
          { role: "user", content: message },
        ]);

        // Read SSE from Groq and forward to client
        const reader = groqStream.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          const lines = text.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") break;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                assistantContent += content;
                controller.enqueue(sseEvent({ type: "chunk", content }));
              }
            } catch {
              // Skip malformed SSE lines
            }
          }
        }

        // ── Persist assistant message ──────────────────────────────────────────
        await query(
          "INSERT INTO chat_messages (session_id, role, content, retrieved_chunks) VALUES ($1, $2, $3, $4)",
          [sessionId, "assistant", assistantContent, JSON.stringify(retrievedChunks)]
        );

        controller.enqueue(sseEvent({ type: "done", session_id: sessionId }));
      } catch (error) {
        console.error("[POST /api/chat]", error);
        const message = error instanceof Error ? error.message : "An error occurred";
        controller.enqueue(sseEvent({ type: "error", message }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
