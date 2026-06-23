/**
 * app/api/auth/register/route.ts
 * POST /api/auth/register
 * Creates a new user account and sets an auth cookie.
 */
import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { hashPassword, createJWT, TOKEN_COOKIE_NAME, TOKEN_COOKIE_OPTIONS } from "@/lib/auth";
import { query } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate inputs
    if (!email || !password) {
      return Response.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (typeof email !== "string" || !email.includes("@")) {
      return Response.json({ error: "Invalid email address" }, { status: 400 });
    }

    if (typeof password !== "string" || password.length < 8) {
      return Response.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existing = await query(
      "SELECT id FROM users WHERE email = $1",
      [email.toLowerCase().trim()]
    );

    if (existing.length > 0) {
      return Response.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const newUsers = await query<{ id: number; email: string }>(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email",
      [email.toLowerCase().trim(), passwordHash]
    );

    const user = newUsers[0];

    // Create JWT and set cookie
    const token = await createJWT({ id: user.id, email: user.email });
    const cookieStore = await cookies();
    cookieStore.set(TOKEN_COOKIE_NAME, token, TOKEN_COOKIE_OPTIONS);

    return Response.json(
      { id: user.id, email: user.email },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/auth/register]", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
