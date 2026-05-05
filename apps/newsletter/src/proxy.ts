import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Admin gate for the Next 16 Proxy layer.
 *
 * [SEC-004] The previous implementation only checked the *presence* of the
 * NextAuth session cookie. Setting `__Secure-authjs.session-token=garbage`
 * was enough to pass the proxy — defence-in-depth was relying entirely on
 * the (dashboard) layout's own `await auth()` call. If a future admin page
 * landed outside that layout, it would be exposed.
 *
 * The NextAuth v5 idiomatic pattern wraps the proxy handler with `auth(...)`,
 * which decodes and verifies the JWT signature using AUTH_SECRET before
 * exposing it as `req.auth`. A spoofed or expired token now hits the redirect
 * here, not just at the layout boundary.
 */
export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;

  // /admin/login is the only admin path reachable while unauthenticated.
  if (!pathname.startsWith("/admin") || pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }

  if (!req.auth) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("callbackUrl", `/newsletter${pathname}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*"],
};
