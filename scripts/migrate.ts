/**
 * scripts/migrate.ts
 * Creates all database tables in Neon PostgreSQL.
 * Run with: npm run db:migrate
 *
 * Also calls ensurePineconeIndex() to create the vector index if missing.
 */
import { config } from "dotenv";
import { join } from "path";

// Load .env.local before any lib imports
config({ path: join(process.cwd(), ".env.local") });

// Now we can import modules that depend on process.env
import { query } from "../lib/db";
import { ensurePineconeIndex } from "../lib/pinecone";

async function migrate() {
  console.log("🚀 Running database migrations...\n");

  // ── Users ─────────────────────────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id          SERIAL PRIMARY KEY,
      email       VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
  console.log("✅ Table: users");

  // ── Repos ─────────────────────────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS repos (
      id              SERIAL PRIMARY KEY,
      user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      github_url      VARCHAR(500) NOT NULL,
      repo_name       VARCHAR(255) NOT NULL,
      owner           VARCHAR(255) NOT NULL,
      indexed_at      TIMESTAMP WITH TIME ZONE,
      status          VARCHAR(50) DEFAULT 'pending',
      file_count      INTEGER DEFAULT 0,
      chunk_count     INTEGER DEFAULT 0,
      language_stats  JSONB DEFAULT '{}',
      error_message   TEXT,
      created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(user_id, github_url)
    )
  `);
  console.log("✅ Table: repos");

  // ── Chat Sessions ──────────────────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id          SERIAL PRIMARY KEY,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      repo_id     INTEGER NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
      title       VARCHAR(500),
      created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
  console.log("✅ Table: chat_sessions");

  // ── Chat Messages ──────────────────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id                SERIAL PRIMARY KEY,
      session_id        INTEGER NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
      role              VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
      content           TEXT NOT NULL,
      retrieved_chunks  JSONB,
      created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
  console.log("✅ Table: chat_messages");

  // ── Indexes for performance ─────────────────────────────────────────────────
  await query(`CREATE INDEX IF NOT EXISTS idx_repos_user_id ON repos(user_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_sessions_repo_id ON chat_sessions(repo_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_messages_session_id ON chat_messages(session_id)`);
  console.log("✅ Indexes created");

  // ── Pinecone ───────────────────────────────────────────────────────────────
  console.log("\n🔍 Ensuring Pinecone index exists...");
  await ensurePineconeIndex();
  console.log("✅ Pinecone index ready");

  console.log("\n🎉 Migration complete!");
}

migrate().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
