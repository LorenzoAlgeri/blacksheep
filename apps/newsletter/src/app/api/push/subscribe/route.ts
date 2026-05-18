import { NextRequest } from "next/server";
import { pushSubscribeSchema } from "@/lib/validations";
import { getSupabase } from "@/lib/supabase";
import { rateLimitPushSubscribe } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (!rateLimitPushSubscribe(ip)) {
    return Response.json({ error: "Troppi tentativi. Riprova tra un minuto." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Richiesta non valida." }, { status: 400 });
  }

  const parsed = pushSubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Dati non validi." }, { status: 400 });
  }

  const { endpoint, keys, subscriberEmail } = parsed.data;
  const supabase = getSupabase();

  // Optionally link to an existing confirmed subscriber
  let subscriberId: string | null = null;
  if (subscriberEmail) {
    const { data: sub } = await supabase
      .from("subscribers")
      .select("id")
      .eq("email", subscriberEmail.toLowerCase())
      .eq("status", "confirmed")
      .maybeSingle();
    subscriberId = sub?.id ?? null;
  }

  // Upsert: ON CONFLICT (endpoint) DO UPDATE so re-subscribing refreshes keys
  const { error: dbError } = await supabase.from("push_subscriptions").upsert(
    {
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      subscriber_id: subscriberId,
    },
    { onConflict: "endpoint" },
  );

  if (dbError) {
    console.error("[PUSH_SUBSCRIBE] Supabase error:", dbError.message, dbError.code);
    return Response.json({ error: "Errore interno. Riprova." }, { status: 500 });
  }

  return Response.json({ ok: true });
}
