/**
 * lib/db.ts
 * Neon serverless PostgreSQL client.
 * Uses @neondatabase/serverless's sql.query() for parameterized queries.
 */
import { neon, NeonQueryFunction } from "@neondatabase/serverless";

let _sql: NeonQueryFunction<false, false> | null = null;

function getSql() {
  if (!_sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}

/**
 * Generic query helper with parameterized inputs.
 * Uses sql.query() which accepts a plain SQL string and params array.
 *
 * Usage:
 *   const rows = await query<User>('SELECT * FROM users WHERE id = $1', [id]);
 */
export async function query<T = Record<string, unknown>>(
  queryString: string,
  params: unknown[] = []
): Promise<T[]> {
  const sqlClient = getSql();
  const result = await sqlClient.query(queryString, params);
  return result as unknown as T[];
}
