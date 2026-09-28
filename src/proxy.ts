import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { readSession } from "./lib/session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = readSession(request.cookies.get("session")?.value);

  if (pathname.startsWith("/me") && session?.role !== "EMPLOYEE") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname.startsWith("/admin") && session?.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname === "/login" && session?.role === "ADMIN") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/me", "/me/:path*", "/e/:path*", "/login", "/admin", "/admin/:path*"],
};
