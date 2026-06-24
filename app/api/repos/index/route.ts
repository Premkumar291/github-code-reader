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
import { parseGithubUrl, fetchRepoFileBatches } from "@/lib/github";
import { chunkFile } from "@/lib/chunker";
import { embedBatch } from "@/lib/embeddings";
import { upsertVectors, type CodeVector } from "@/lib/pinecone";

// Vercel timeout safety: Allow up to 60 seconds execution (Hobby tier limit)
export const maxDuration = 60;

const EMBED_BATCH_SIZE = 4;

type ChunkRecord = {
  filePath: string;
  language: string;
  text: string;
  lineStart: number;
  lineEnd: number;
};

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

        const languageCounts: Record<string, number> = {};
        let processedFiles = 0;
        let chunkCount = 0;
        let upsertedCount = 0;
        let vectorIndex = 0;
        let fetchedFiles = 0;

        send(controller, {
          type: "status",
          message: "Fetching and processing files in small batches...",
          step: 3,
          totalSteps: 4,
        });

        for await (const fileBatch of fetchRepoFileBatches(owner, repo, (current, total) => {
          fetchedFiles = total;
          send(controller, {
            type: "progress",
            step: "fetch",
            current,
            total,
            message: `Fetching files: ${current}/${total}`,
          });
        })) {
          const batchChunks: ChunkRecord[] = [];

          for (const file of fileBatch) {
            const chunks = chunkFile(file.content, file.language);
            for (const chunk of chunks) {
              batchChunks.push({
                filePath: file.path,
                language: file.language,
                text: chunk.text,
                lineStart: chunk.lineStart,
                lineEnd: chunk.lineEnd,
              });
            }
            languageCounts[file.language] = (languageCounts[file.language] ?? 0) + 1;
          }

          if (fileBatch.length === 0) {
            continue;
          }

          processedFiles += fileBatch.length;
          chunkCount += batchChunks.length;
          send(controller, {
            type: "progress",
            step: "chunk",
            current: processedFiles,
            total: fetchedFiles || processedFiles,
            message: `Chunked ${processedFiles}/${fetchedFiles || processedFiles} files`,
          });

          for (let i = 0; i < batchChunks.length; i += EMBED_BATCH_SIZE) {
            const embedBatchChunks = batchChunks.slice(i, i + EMBED_BATCH_SIZE);
            const texts = embedBatchChunks.map((chunk) => chunk.text);

            let embeddings: number[][];
            try {
              embeddings = await embedBatch(texts);
              await new Promise((resolve) => setTimeout(resolve, 10));
            } catch (embErr) {
              console.error("Embedding batch error, skipping:", embErr);
              continue;
            }

            const vectors: CodeVector[] = [];
            for (let j = 0; j < embedBatchChunks.length; j++) {
              const chunk = embedBatchChunks[j];
              const embedding = embeddings[j];
              if (!embedding) continue;

              vectors.push({
                id: `repo-${repoId}-${vectorIndex++}`, 
                values: embedding,
                metadata: {
                  repoId: repoId!,
                  filePath: chunk.filePath,
                  lineStart: chunk.lineStart,
                  lineEnd: chunk.lineEnd,
                  language: chunk.language,
                  text: chunk.text.slice(0, 1500),
                },
              });
            }

            if (vectors.length > 0) {
              await upsertVectors(vectors);
              upsertedCount += vectors.length;
              const estimatedTotalChunks = fetchedFiles && processedFiles 
                ? Math.round((chunkCount / processedFiles) * fetchedFiles) 
                : chunkCount;
              send(controller, {
                type: "progress",
                step: "embed",
                current: upsertedCount,
                total: estimatedTotalChunks,
                message: `Embedded and stored ${upsertedCount}/${estimatedTotalChunks} chunks`,
              });
            }
          }
        }

        if (processedFiles === 0) {
          throw new Error("No indexable files found in this repository.");
        }

        send(controller, {
          type: "status",
          message: `Upserted ${upsertedCount} vectors to Pinecone...`,
          step: 4,
          totalSteps: 4,
        });

        // ── Update repo record ────────────────────────────────────────────────
        await query(
          `UPDATE repos
           SET status = 'ready', indexed_at = NOW(), file_count = $1,
               chunk_count = $2, language_stats = $3, updated_at = NOW()
           WHERE id = $4`,
          [processedFiles, upsertedCount, JSON.stringify(languageCounts), repoId]
        );

        send(controller, {
          type: "done",
          repoId,
          fileCount: processedFiles,
          chunkCount: upsertedCount,
          languageStats: languageCounts,
          message: `✅ Indexing complete! ${processedFiles} files, ${upsertedCount} chunks indexed.`,
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
