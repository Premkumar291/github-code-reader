const { config } = require("dotenv");
config({ path: ".env.local" });

async function testGroqEmbeddings() {
  console.log("Testing Groq Embeddings...");
  const res = await fetch("https://api.groq.com/openai/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      input: "hello world",
      model: "nomic-embed-text-v1.5"
    })
  });
  console.log("Status:", res.status);
  const data = await res.json();
  console.log("Response:", JSON.stringify(data).slice(0, 200));
}

testGroqEmbeddings();
