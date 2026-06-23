/**
 * lib/auth.ts
 * JWT creation/verification using `jose` (edge-compatible).
 * Password hashing using `bcryptjs` (pure JS, works in all environments).
 */
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

const BCRYPT_ROUNDS = 12;
const JWT_EXPIRY = "7d";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not set");
}

// Encode secret as Uint8Array for jose
const getSecretKey = () =>
  new TextEncoder().encode(process.env.JWT_SECRET as string);

// ─── Password Hashing ─────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─── JWT ─────────────────────────────────────────────────────────────────────

export interface AuthPayload extends JWTPayload {
  id: number;
  email: string;
}

export async function createJWT(payload: AuthPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(getSecretKey());
}

export async function verifyJWT(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as AuthPayload;
  } catch {
    return null;
  }
}

// ─── Cookie Config ────────────────────────────────────────────────────────────

export const TOKEN_COOKIE_NAME = "ca_token";

export const TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
  path: "/",
};
