import { NextRequest } from "next/server";
import { contactSchema } from "@/lib/validations";
import { contactRateLimit } from "@/lib/rate-limit";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(request: NextRequest) {
  // Rate limit by IP
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!contactRateLimit(ip)) {
    return Response.json({ error: "Troppi tentativi. Riprova tra un minuto." }, { status: 429 });
  }

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Richiesta non valida." }, { status: 400 });
  }

  // Validate with Zod
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Dati non validi." }, { status: 400 });
  }

  // Honeypot check — bots fill the hidden "website" field
  if (parsed.data.website) {
    // Return 200 to not reveal the trap
    return Response.json({ success: true });
  }

  // Sanitize all string values
  const name = escapeHtml(parsed.data.name);
  const date = escapeHtml(parsed.data.date);
  const guests = parsed.data.guests;
  const message = parsed.data.message ? escapeHtml(parsed.data.message) : "";

  // Build WhatsApp URL
  const text = [
    "Ciao, vorrei prenotare un tavolo.",
    "",
    `Nome: ${name}`,
    `Data: ${date}`,
    `Persone: ${guests}`,
    message ? `Note: ${message}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const whatsappUrl = `https://wa.me/393XXXXXXXXX?text=${encodeURIComponent(text)}`;

  return Response.json({ success: true, whatsappUrl });
}
