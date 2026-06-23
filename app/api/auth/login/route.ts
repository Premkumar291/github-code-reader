/**
 * app/api/auth/login/route.ts
 * POST /api/auth/login
 * Authenticates an existing user and sets an auth cookie.
 */
import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifyPassword, createJWT, TOKEN_COOKIE_NAME, TOKEN_COOKIE_OPTIONS } from "@/lib/auth";
import { query } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return Response.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Find user by email
    const users = await query<{ id: number; email: string; password_hash: string }>(
      "SELECT id, email, password_hash FROM users WHERE email = $1",
      [email.toLowerCase().trim()]
    );

    if (users.length === 0) {
      // Use generic message to avoid email enumeration
      return Response.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const user = users[0];
    const valid = await verifyPassword(password, user.password_hash);

    if (!valid) {
      return Response.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Create JWT and set cookie
    const token = await createJWT({ id: user.id, email: user.email });
    const cookieStore = await cookies();
    cookieStore.set(TOKEN_COOKIE_NAME, token, TOKEN_COOKIE_OPTIONS);

    return Response.json({ id: user.id, email: user.email });
  } catch (error) {
    console.error("[POST /api/auth/login]", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
