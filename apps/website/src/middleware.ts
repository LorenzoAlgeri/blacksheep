import { NextRequest, NextResponse } from "next/server";

const PREVIEW_PASSWORD = process.env.SITE_PREVIEW_PASSWORD;

export function middleware(request: NextRequest) {
  // Skip protection for newsletter rewrite paths
  if (request.nextUrl.pathname.startsWith("/newsletter")) {
    return NextResponse.next();
  }

  // Skip if no password is configured (local dev)
  if (!PREVIEW_PASSWORD) {
    return NextResponse.next();
  }

  // Check for auth cookie
  const authCookie = request.cookies.get("site-preview-auth");
  if (authCookie?.value === PREVIEW_PASSWORD) {
    return NextResponse.next();
  }

  // Check for password in query param (login link)
  const passwordParam = request.nextUrl.searchParams.get("password");
  if (passwordParam === PREVIEW_PASSWORD) {
    const response = NextResponse.redirect(new URL(request.nextUrl.pathname, request.url));
    response.cookies.set("site-preview-auth", PREVIEW_PASSWORD, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    return response;
  }

  // Show coming soon page
  return new NextResponse(
    `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>BLACK SHEEP — Coming Soon</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #000;
      color: #fffff3;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
    }
    h1 {
      font-family: 'Arial Black', Arial, sans-serif;
      font-size: clamp(2.5rem, 8vw, 4rem);
      letter-spacing: 0.02em;
      line-height: 0.85;
      margin-bottom: 2rem;
    }
    p {
      color: rgba(255,255,243,0.4);
      font-size: 0.85rem;
      letter-spacing: 0.15em;
      text-transform: uppercase;
    }
  </style>
</head>
<body>
  <div>
    <h1>BLACK<br>SHEEP</h1>
    <p>Coming Soon</p>
  </div>
</body>
</html>`,
    {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    },
  );
}

export const config = {
  matcher: [
    // Match all paths except static files and Next internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|jpg|jpeg|png|webp|avif|ico|css|js)).*)",
  ],
};
