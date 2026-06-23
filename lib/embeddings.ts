/**
 * lib/embeddings.ts
 * Generates text embeddings using @xenova/transformers via WASM.
 * Model: Xenova/all-MiniLM-L6-v2 (384 dimensions)
 * This avoids DNS issues, rate limits, and Vercel 10s timeouts.
 */
import { pipeline } from "@xenova/transformers";

let extractor: any = null;

async function getExtractor() {
  if (!extractor) {
    extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }
  return extractor;
}

/**
 * Embeds a single piece of text.
 * Returns a 384-dimensional float vector.
 */
export async function embedText(text: string): Promise<number[]> {
  const truncated = text.slice(0, 2000);
  const extract = await getExtractor();
  const output = await extract(truncated, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}

/**
 * Embeds multiple texts in a single batch.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  
  const truncated = texts.map((t) => t.slice(0, 2000));
  const extract = await getExtractor();
  
  // Xenova supports batching natively
  const output = await extract(truncated, { pooling: "mean", normalize: true });
  
  const embeddings: number[][] = [];
  const batchSize = output.dims[0];
  const dim = output.dims[1]; // 384
  
  for (let i = 0; i < batchSize; i++) {
    const start = i * dim;
    const end = start + dim;
    embeddings.push(Array.from(output.data.subarray(start, end)));
  }
  
  return embeddings;
}
