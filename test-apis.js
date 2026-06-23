const { config } = require("dotenv");
const path = require("path");

config({ path: path.join(__dirname, ".env.local") });

const https = require("https");

async function testHF() {
  console.log("Resolving via DoH...");
  const dnsRes = await fetch("https://dns.google/resolve?name=api-inference.huggingface.co");
  const dnsJson = await dnsRes.json();
  const ip = dnsJson.Answer.find(a => a.type === 1).data;
  console.log("Resolved IP:", ip);

  const payload = JSON.stringify({ inputs: "Hello world" });

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
      model: "nomic-embed-text-v1_5"
    })
  });
  console.log("Status:", res.status);
  const data = await res.json();
  console.log("Response:", JSON.stringify(data).slice(0, 200));
}

testGroqEmbeddings();
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log("Response:", data.slice(0, 100)));
  });
  
  req.on('error', (e) => console.log("Error:", e.message));
  req.write(payload);
  req.end();
}

async function testGroq() {
  console.log("Testing Groq...");
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
}

async function main() {
  await testHF();
  await testGroq();
}
main();
