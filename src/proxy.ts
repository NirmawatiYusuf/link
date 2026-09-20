import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { hasValidSession } from "@/lib/auth";

const intlMiddleware = createMiddleware(routing);

const PUBLIC_API = new Set(["/api/gate/login", "/api/gate/logout", "/api/health"]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authenticated = await hasValidSession(request);

  if (pathname.startsWith("/api")) {
    if (!authenticated && !PUBLIC_API.has(pathname)) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 },
      );
    }
    return NextResponse.next();
  }

  if (pathname === "/gate") {
    if (authenticated) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return intlMiddleware(request);
  }

  if (!authenticated) {
    return NextResponse.redirect(new URL("/gate", request.url));
  }
  return intlMiddleware(request);
}

export const config = {
  // Proxy never sees static assets (matched by Next before us) and public files.
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
};
