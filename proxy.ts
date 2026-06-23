/**
 * proxy.ts  (replaces middleware.ts — renamed in Next.js 16)
 * Protects all /dashboard/* routes by verifying the JWT cookie.
 * Redirects to /login if the token is missing or invalid.
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyJWT, TOKEN_COOKIE_NAME } from "@/lib/auth";

const PROTECTED_PATHS = ["/repos", "/chat"];
const AUTH_ONLY_PATHS = ["/login", "/register"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(TOKEN_COOKIE_NAME)?.value;

  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  const isAuthOnly = AUTH_ONLY_PATHS.some((p) => pathname.startsWith(p));

  if (isProtected) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    const payload = await verifyJWT(token);
    if (!payload) {
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete(TOKEN_COOKIE_NAME);
      return response;
    }
  }

  if (isAuthOnly && token) {
    const payload = await verifyJWT(token);
    if (payload) {
      return NextResponse.redirect(new URL("/repos", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
