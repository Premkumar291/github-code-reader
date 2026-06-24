/**
 * lib/pinecone.ts
 * Pinecone vector database client (v8 API).
 * Index dimension: 1024 for Cohere embed-english-v3.0 vectors, Metric: cosine
 *
 * Pinecone v8 API changes:
 * - index.upsert({ records: [...] }) — NOT upsert([...])
 * - index.deleteMany({ filter: {...} }) — for metadata filter deletes
 * - index.query({ vector, topK, filter, includeMetadata }) — unchanged
 */
import { Pinecone, type PineconeRecord } from "@pinecone-database/pinecone";

const EMBEDDING_DIMENSION = 1024;

// Singleton client
let _client: Pinecone | null = null;

function getClient(): Pinecone {
  if (!_client) {
    if (!process.env.PINECONE_API_KEY) {
      throw new Error("PINECONE_API_KEY environment variable is not set");
    }
    _client = new Pinecone({ apiKey: process.env.PINECONE_API_KEY as string });
  }
  return _client;
}

function getIndex() {
  if (!process.env.PINECONE_INDEX_NAME) {
    throw new Error("PINECONE_INDEX_NAME environment variable is not set");
  }
  return getClient().index<CodeVectorMetadata>(
    process.env.PINECONE_INDEX_NAME as string
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CodeVectorMetadata {
  [key: string]: string | number | boolean | string[];  // satisfies RecordMetadata
  repoId: number;
  filePath: string;
  lineStart: number;
  lineEnd: number;
  language: string;
  text: string;
}

export interface CodeVector {
  id: string;
  values: number[];
  metadata: CodeVectorMetadata;
}

export interface QueryResult {
  id: string;
  score: number;
  metadata: CodeVectorMetadata;
}

// ─── Operations ───────────────────────────────────────────────────────────────

/**
 * Upsert a batch of vectors into Pinecone.
 * v8 API: index.upsert({ records: [...] })
 */
export async function upsertVectors(vectors: CodeVector[]): Promise<void> {
  const index = getIndex();
  const BATCH_SIZE = 100;

  for (let i = 0; i < vectors.length; i += BATCH_SIZE) {
    const batch = vectors.slice(i, i + BATCH_SIZE);

    // Map to PineconeRecord shape
    const records: PineconeRecord<CodeVectorMetadata>[] = batch.map((v) => ({
      id: v.id,
      values: v.values,
      metadata: v.metadata,
    }));

    await index.upsert({ records });
  }
}

/**
 * Query Pinecone for the top-K most similar vectors,
 * filtered to a specific repo ID.
 */
export async function queryVectors(
  embedding: number[],
  repoId: number,
  topK = 6
): Promise<QueryResult[]> {
  const index = getIndex();

  const result = await index.query({
    vector: embedding,
    topK,
    filter: { repoId: { $eq: repoId } },
    includeMetadata: true,
  });

  return (result.matches ?? []).map((m) => ({
    id: m.id,
    score: m.score ?? 0,
    metadata: m.metadata as CodeVectorMetadata,
  }));
}

/**
 * Delete all vectors associated with a repo (used when deleting a repo).
 * v8 API: index.deleteMany({ filter: { ... } })
 */
export async function deleteVectorsByRepoId(repoId: number): Promise<void> {
  const index = getIndex();
  await index.deleteMany({ filter: { repoId: { $eq: repoId } } });
}

/**
 * Ensure the Pinecone index exists. Creates it if missing.
 * Called during DB migration.
 * Dimension: 1024 (for Cohere embeddings: embed-english-v3.0)
 */
export async function ensurePineconeIndex(): Promise<void> {
  if (!process.env.PINECONE_INDEX_NAME) {
    throw new Error("PINECONE_INDEX_NAME environment variable is not set");
  }
  const client = getClient();
  const indexName = process.env.PINECONE_INDEX_NAME as string;

  const { indexes } = await client.listIndexes();
  const exists = (indexes ?? []).some((idx) => idx.name === indexName);

  if (!exists) {
    console.log(`[Pinecone] Creating index "${indexName}"...`);
    await client.createIndex({
      name: indexName,
      dimension: EMBEDDING_DIMENSION,
      metric: "cosine",
      spec: {
        serverless: {
          cloud: "aws",
          region: "us-east-1",
        },
      },
    });

    // Wait for index to be ready
    let ready = false;
    while (!ready) {
      await new Promise((r) => setTimeout(r, 3000));
      const description = await client.describeIndex(indexName);
      ready = description.status?.ready === true;
    }
    console.log(`[Pinecone] Index "${indexName}" is ready.`);
    return;
  }

  const description = await client.describeIndex(indexName);
  const currentDimension = description.dimension ?? null;

  if (currentDimension !== EMBEDDING_DIMENSION) {
    throw new Error(
      `[Pinecone] Index "${indexName}" has dimension ${currentDimension}, but the app now uses ${EMBEDDING_DIMENSION}-dim Cohere embeddings. Delete and recreate the index, then rerun npm run db:migrate.`
    );
  }
}
