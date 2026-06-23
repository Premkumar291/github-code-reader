/**
 * app/api/auth/logout/route.ts
 * POST /api/auth/logout
 * Clears the auth cookie.
 */
import { cookies } from "next/headers";
import { TOKEN_COOKIE_NAME } from "@/lib/auth";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(TOKEN_COOKIE_NAME);
  return Response.json({ success: true });
}
