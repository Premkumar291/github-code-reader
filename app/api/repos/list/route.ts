/**
 * app/api/repos/list/route.ts
 * GET /api/repos/list
 * Returns all repos for the current authenticated user.
 */
import { cookies } from "next/headers";
import { verifyJWT, TOKEN_COOKIE_NAME } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(TOKEN_COOKIE_NAME)?.value;
    if (!token) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return Response.json({ error: "Invalid token" }, { status: 401 });
    }

    const repos = await query(
      `SELECT id, github_url, repo_name, owner, status, indexed_at,
              file_count, chunk_count, language_stats, error_message, created_at
       FROM repos
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [payload.id]
    );

    return Response.json({ repos });
  } catch (error) {
    console.error("[GET /api/repos/list]", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
