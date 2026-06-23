/**
 * app/api/auth/me/route.ts
 * GET /api/auth/me
 * Returns the current authenticated user's profile.
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
      return Response.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const users = await query<{ id: number; email: string; created_at: string }>(
      "SELECT id, email, created_at FROM users WHERE id = $1",
      [payload.id]
    );

    if (users.length === 0) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    return Response.json(users[0]);
  } catch (error) {
    console.error("[GET /api/auth/me]", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
