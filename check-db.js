const { config } = require("dotenv");
const path = require("path");
config({ path: path.join(__dirname, ".env.local") });

const { neon } = require("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL);

async function check() {
  const repos = await sql`SELECT * FROM repos`;
  console.log("Repos:", repos);
}
check();
