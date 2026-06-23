/**
 * lib/embeddings.ts
 * Generates text embeddings using Hugging Face Inference API.
 * Free tier: 50,000 calls/month
 */

const HF_MODEL = "sentence-transformers/all-MiniLM-L6-v2";
const HF_API_URL = `https://api-inference.huggingface.co/pipeline/feature-extraction/${HF_MODEL}`;

/**
 * Embeds a single piece of text.
 * Returns a 384-dimensional float vector.
 */
export async function embedText(text: string): Promise<number[]> {
  const truncated = text.slice(0, 2000);
  
  const response = await fetch(HF_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.HF_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inputs: truncated }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Hugging Face API error: ${response.status} — ${errText}`);
  }

  const result = await response.json();
  if (Array.isArray(result)) {
    return result as number[];
  }
  throw new Error("Invalid embedding format returned from HF");
}

/**
 * Embeds multiple texts in a single batch.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const truncated = texts.map((t) => t.slice(0, 2000));

  const response = await fetch(HF_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.HF_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inputs: truncated }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Hugging Face API error: ${response.status} — ${errText}`);
  }

  const result = await response.json();
  
  if (Array.isArray(result) && result.length > 0 && Array.isArray(result[0])) {
    return result as number[][];
  }
  
  if (Array.isArray(result) && typeof result[0] === "number") {
    return [result as number[]];
  }

  throw new Error("Invalid batch embedding format returned from HF");
}
