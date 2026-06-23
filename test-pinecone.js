const { Pinecone } = require("@pinecone-database/pinecone");
const { config } = require("dotenv");
config({ path: ".env.local" });

async function testPinecone() {
  console.log("Testing Pinecone Inference...");
  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  try {
    const response = await pc.inference.embed(
      "multilingual-e5-large",
      ["Hello world"],
      { inputType: "passage", truncate: "END" }
    );
    console.log("Success! Response:", JSON.stringify(response).slice(0, 200));
  } catch (err) {
    console.log("Error:", err.message);
  }
}

testPinecone();
