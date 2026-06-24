const { config } = require("dotenv");
const path = require("path");

config({ path: path.join(__dirname, ".env.local") });

async function testCohere() {
  console.log("Testing Cohere Embeddings...");
  try {
    const res = await fetch("https://api.cohere.com/v1/embed", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.COHERE_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        texts: ["hello world"],
        model: "embed-english-v3.0",
        input_type: "search_document"
      })
    });
    console.log("Cohere Status:", res.status);
    if (!res.ok) {
      console.log("Cohere Error:", await res.text());
    } else {
      const data = await res.json();
      console.log("Cohere Success - Embedding dimension:", data.embeddings?.[0]?.length || "unknown");
    }
  } catch (err) {
    console.log("Cohere Error:", err.message);
  }
}

async function testGroq() {
  console.log("Testing Groq LLM...");
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 10,
      }),
    });
    console.log("Groq Status:", res.status);
    if (!res.ok) {
      console.log("Groq Error:", await res.text());
    } else {
      console.log("Groq Success");
    }
  } catch (err) {
    console.log("Groq Error:", err.message);
  }
}

async function main() {
  console.log("API Test Starting...\n");
  await testCohere();
  console.log();
  await testGroq();
}

main();
