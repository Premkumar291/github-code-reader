/**
 * app/api/repos/index/route.ts
 * POST /api/repos/index
 *
 * Full indexing pipeline:
 * 1. Parse & validate GitHub URL
 * 2. Insert/update repo record in Neon
 * 3. Fetch files from GitHub API (max 400)
 * 4. Chunk each file (language-aware)
 * 5. Batch embed chunks via Hugging Face
 * 6. Upsert vectors to Pinecone
 * 7. Update repo status and stats
 *
 * Returns Server-Sent Events (SSE) stream for real-time progress.
 */
import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifyJWT, TOKEN_COOKIE_NAME } from "@/lib/auth";
import { query } from "@/lib/db";
import { parseGithubUrl, fetchRepoFiles } from "@/lib/github";
import { chunkFile } from "@/lib/chunker";
import { embedBatch } from "@/lib/embeddings";
import { upsertVectors, type CodeVector } from "@/lib/pinecone";

// Vercel timeout safety: chunk batch size for embedding
const EMBED_BATCH_SIZE = 20;

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  // Helper: write an SSE event to the stream controller
  const send = (
    controller: ReadableStreamDefaultController,
    data: Record<string, unknown>
  ) => {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
  };

  const stream = new ReadableStream({
    async start(controller) {
      let repoId: number | null = null;

      try {
        // ── Auth ──────────────────────────────────────────────────────────────
        const cookieStore = await cookies();
        const token = cookieStore.get(TOKEN_COOKIE_NAME)?.value;
        if (!token) {
          send(controller, { type: "error", message: "Not authenticated" });
          controller.close();
          return;
        }

        const payload = await verifyJWT(token);
        if (!payload) {
          send(controller, { type: "error", message: "Invalid token" });
          controller.close();
          return;
        }

        // ── Parse URL ─────────────────────────────────────────────────────────
        const body = await request.json();
        const { github_url } = body;

        if (!github_url || typeof github_url !== "string") {
          send(controller, { type: "error", message: "github_url is required" });
          controller.close();
          return;
        }

        let parsed: { owner: string; repo: string };
        try {
          parsed = parseGithubUrl(github_url);
        } catch (e) {
          send(controller, { type: "error", message: (e as Error).message });
          controller.close();
          return;
        }

        const { owner, repo } = parsed;
        const repoName = `${owner}/${repo}`;

        // ── Check if already indexing ─────────────────────────────────────────
        const existing = await query<{ status: string }>(
          "SELECT status FROM repos WHERE user_id = $1 AND github_url = $2",
          [payload.id, github_url.trim()]
        );
        if (existing.length > 0 && existing[0].status === "indexing") {
          send(controller, { type: "error", message: "Repository is already being indexed" });
          controller.close();
          return;
        }

        send(controller, { type: "status", message: `Starting indexing for ${repoName}...` });

        // ── Upsert repo record ────────────────────────────────────────────────
        const repos = await query<{ id: number }>(
          `INSERT INTO repos (user_id, github_url, repo_name, owner, status)
           VALUES ($1, $2, $3, $4, 'indexing')
           ON CONFLICT (user_id, github_url)
           DO UPDATE SET status = 'indexing', error_message = NULL, updated_at = NOW()
           RETURNING id`,
          [payload.id, github_url.trim(), repo, owner]
        );
        repoId = repos[0].id;

        // ── Fetch files ───────────────────────────────────────────────────────
        send(controller, {
          type: "status",
          message: "Fetching file list from GitHub...",
          step: 1,
          totalSteps: 4,
        });

        const files = await fetchRepoFiles(owner, repo, (current, total) => {
          send(controller, {
            type: "progress",
            step: "fetch",
            current,
            total,
            message: `Fetching files: ${current}/${total}`,
          });
        });

        if (files.length === 0) {
          throw new Error("No indexable files found in this repository.");
        }

        send(controller, {
          type: "status",
          message: `Fetched ${files.length} files. Chunking...`,
          step: 2,
          totalSteps: 4,
        });

        // ── Chunk files ───────────────────────────────────────────────────────
        const allChunks: Array<{
          filePath: string;
          language: string;
          text: string;
          lineStart: number;
          lineEnd: number;
        }> = [];

        const languageCounts: Record<string, number> = {};

        for (const file of files) {
          const chunks = chunkFile(file.content, file.language, file.path);
          for (const chunk of chunks) {
            allChunks.push({
              filePath: file.path,
              language: file.language,
              text: chunk.text,
              lineStart: chunk.lineStart,
              lineEnd: chunk.lineEnd,
            });
          }
          languageCounts[file.language] = (languageCounts[file.language] ?? 0) + 1;
        }

        send(controller, {
          type: "status",
          message: `Created ${allChunks.length} chunks. Generating embeddings...`,
          step: 3,
          totalSteps: 4,
        });

        // ── Embed & upsert ────────────────────────────────────────────────────
        let embeddedCount = 0;
        const vectors: CodeVector[] = [];
        const EMBED_BATCH_SIZE = 5; // Lowered to 5 to prevent WebAssembly OOM

        for (let i = 0; i < allChunks.length; i += EMBED_BATCH_SIZE) {
          const batch = allChunks.slice(i, i + EMBED_BATCH_SIZE);
          const texts = batch.map((c) => c.text);

          let embeddings: number[][];
          try {
            embeddings = await embedBatch(texts);
            // Yield to the Node.js event loop to allow WebAssembly garbage collection
            await new Promise((r) => setTimeout(r, 10));
          } catch (embErr) {
            console.error("Embedding batch error, skipping:", embErr);
            continue;
          }

          for (let j = 0; j < batch.length; j++) {
            const chunk = batch[j];
            const embedding = embeddings[j];
            if (!embedding) continue;

            vectors.push({
              id: `repo-${repoId}-${i + j}`,
              values: embedding,
              metadata: {
                repoId: repoId!,
                filePath: chunk.filePath,
                lineStart: chunk.lineStart,
                lineEnd: chunk.lineEnd,
                language: chunk.language,
                // Truncate text in metadata to stay under Pinecone's 40KB/record limit
                text: chunk.text.slice(0, 1500),
              },
            });
          }

          embeddedCount += batch.length;
          send(controller, {
            type: "progress",
            step: "embed",
            current: embeddedCount,
            total: allChunks.length,
            message: `Embedding chunks: ${embeddedCount}/${allChunks.length}`,
          });
        }

        // Upsert all vectors to Pinecone
        send(controller, {
          type: "status",
          message: `Upserting ${vectors.length} vectors to Pinecone...`,
          step: 4,
          totalSteps: 4,
        });

        await upsertVectors(vectors);

        // ── Update repo record ────────────────────────────────────────────────
        await query(
          `UPDATE repos
           SET status = 'ready', indexed_at = NOW(), file_count = $1,
               chunk_count = $2, language_stats = $3, updated_at = NOW()
           WHERE id = $4`,
          [files.length, vectors.length, JSON.stringify(languageCounts), repoId]
        );

        send(controller, {
          type: "done",
          repoId,
          fileCount: files.length,
          chunkCount: vectors.length,
          languageStats: languageCounts,
          message: `✅ Indexing complete! ${files.length} files, ${vectors.length} chunks indexed.`,
        });
      } catch (error) {
        console.error("[POST /api/repos/index]", error);
        const message =
          error instanceof Error ? error.message : "Unknown error occurred";

        // Mark repo as failed if we have an ID
        if (repoId) {
          await query(
            "UPDATE repos SET status = 'failed', error_message = $1, updated_at = NOW() WHERE id = $2",
            [message, repoId]
          ).catch(() => {});
        }

        send(controller, { type: "error", message });
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
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  });
}
