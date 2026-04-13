import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /admin routes (except /admin/login)
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    // Check for session token (NextAuth v5 uses __Secure- prefix in production)
    const token =
      request.cookies.get("__Secure-authjs.session-token") ??
      request.cookies.get("authjs.session-token");

    if (!token) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/admin/login";
      loginUrl.search = "";
      loginUrl.searchParams.set("callbackUrl", `/newsletter${pathname}`);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
