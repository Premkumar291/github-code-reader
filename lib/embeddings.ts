/**
 * lib/embeddings.ts
 * Generates text embeddings using Cohere API.
 * Free tier: 100 API calls/month
 */

const COHERE_API_URL = "https://api.cohere.com/v1/embed";

/**
 * Embeds a single piece of text.
 * Returns a 1024-dimensional float vector.
 */
export async function embedText(text: string): Promise<number[]> {
  const truncated = text.slice(0, 2000);
  
  const response = await fetch(COHERE_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.COHERE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      texts: [truncated],
      model: "embed-english-v3.0",
      input_type: "search_document",
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Cohere API error: ${response.status} — ${errText}`);
  }

  const result = await response.json();
  if (result.embeddings && Array.isArray(result.embeddings) && result.embeddings.length > 0) {
    return result.embeddings[0] as number[];
  }
  throw new Error("Invalid embedding format returned from Cohere");
}

/**
 * Embeds multiple texts in a single batch.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const truncated = texts.map((t) => t.slice(0, 2000));

  const response = await fetch(COHERE_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.COHERE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      texts: truncated,
      model: "embed-english-v3.0",
      input_type: "search_document",
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Cohere API error: ${response.status} — ${errText}`);
  }

  const result = await response.json();
  
  if (result.embeddings && Array.isArray(result.embeddings)) {
    return result.embeddings as number[][];
  }

  throw new Error("Invalid batch embedding format returned from Nomic");
}
