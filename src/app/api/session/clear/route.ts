import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/jwt";

/** Clears a session whose user no longer exists, avoiding a redirect loop. */
export function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.set(SESSION_COOKIE, "", sessionCookieOptions(0));
  return response;
}
