import { NextRequest } from "next/server";
import { handlers } from "@/lib/auth";
import { rateLimitLogin } from "@/lib/rate-limit";

export const { GET } = handlers;

// Wrap POST to add rate limiting on login attempts
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ nextauth: string[] }> },
) {
  const params = await context.params;
  const isSignIn =
    params.nextauth?.includes("callback") && params.nextauth?.includes("credentials");

  if (isSignIn) {
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    if (!rateLimitLogin(ip)) {
      return Response.json(
        { error: "Troppi tentativi di accesso. Riprova tra 15 minuti." },
        { status: 429 },
      );
    }
  }

  return handlers.POST!(request);
}
