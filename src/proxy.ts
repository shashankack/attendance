import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { readSession } from "./lib/session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = readSession(request.cookies.get("session")?.value);

  if ((pathname.startsWith("/me") || pathname.startsWith("/admin")) && !session) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname.startsWith("/admin") && session?.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/me", request.url));
  }

  if (pathname.startsWith("/me") && session?.role === "ADMIN") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  if (pathname === "/" && session) {
    return NextResponse.redirect(new URL(session.role === "ADMIN" ? "/admin" : "/me", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/me/:path*", "/admin/:path*"],
};
