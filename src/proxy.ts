import { NextResponse, type NextRequest } from "next/server";
import { hasValidSession } from "@/lib/auth";

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
    return NextResponse.next();
  }

  if (!authenticated) {
    return NextResponse.redirect(new URL("/gate", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Proxy never sees static assets (matched by Next before us) and public files.
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
};
