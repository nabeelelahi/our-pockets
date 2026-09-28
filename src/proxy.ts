import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/jwt";

// Optimistic route protection only: it keeps logged-out visitors away from app
// pages. Real authorization happens server-side in every page, action and service.

const PUBLIC_PATHS = ["/login", "/register", "/invite"];
const AUTH_PAGES = ["/login", "/register"];

function matches(pathname: string, paths: string[]) {
  return paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const userId = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);

  if (!userId && !matches(pathname, PUBLIC_PATHS)) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  if (userId && matches(pathname, AUTH_PAGES) && !request.nextUrl.searchParams.has("next")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Everything except Next internals, API routes and static/PWA assets.
    "/((?!api|_next/static|_next/image|favicon.ico|icon|apple-icon|pwa-icons|manifest.webmanifest|sw.js|offline.html).*)",
  ],
};
