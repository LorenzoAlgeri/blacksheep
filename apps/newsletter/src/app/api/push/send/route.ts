import { NextRequest } from "next/server";
import webpush from "web-push";
import { auth } from "@/lib/auth";
import { pushSendSchema } from "@/lib/validations";
import { getSupabase } from "@/lib/supabase";

function getVapidConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey) throw new Error("Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY");
  if (!privateKey) throw new Error("Missing VAPID_PRIVATE_KEY");
  if (!subject) throw new Error("Missing VAPID_SUBJECT");

  return { publicKey, privateKey, subject };
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Non autorizzato" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Richiesta non valida." }, { status: 400 });
  }

  const parsed = pushSendSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Dati non validi.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { publicKey, privateKey, subject } = getVapidConfig();
  webpush.setVapidDetails(subject, publicKey, privateKey);

  const supabase = getSupabase();
  const { data: subscriptions, error: fetchError } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth");

  if (fetchError) {
    console.error("[PUSH_SEND] Fetch error:", fetchError.message, fetchError.code);
    return Response.json({ error: "Errore database" }, { status: 500 });
  }

  if (!subscriptions || subscriptions.length === 0) {
    return Response.json({ sent: 0, failed: 0, cleaned: 0 });
  }

  const payload = JSON.stringify({
    title: parsed.data.title,
    body: parsed.data.body,
    url: parsed.data.url ?? "/newsletter",
    eventId: parsed.data.eventId,
  });

  let sent = 0;
  let failed = 0;
  let cleaned = 0;
  const expiredIds: string[] = [];

  // Send notifications in parallel with a concurrency cap to avoid
  // overwhelming the push service
  const BATCH_SIZE = 50;
  for (let i = 0; i < subscriptions.length; i += BATCH_SIZE) {
    const batch = subscriptions.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (sub) => {
        const pushSub = {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        };
        try {
          await webpush.sendNotification(pushSub, payload);
          sent++;
        } catch (err: unknown) {
          const statusCode = (err as { statusCode?: number })?.statusCode;
          if (statusCode === 410 || statusCode === 404) {
            // Subscription expired or invalid — mark for cleanup
            expiredIds.push(sub.id);
            cleaned++;
          } else {
            failed++;
            console.error("[PUSH_SEND] Send error for", sub.endpoint, err);
          }
        }
      }),
    );
    // Log any unexpected rejections (shouldn't happen since we catch inside)
    results.forEach((r) => {
      if (r.status === "rejected") {
        console.error("[PUSH_SEND] Unexpected rejection:", r.reason);
      }
    });
  }

  // Clean up expired subscriptions
  if (expiredIds.length > 0) {
    const { error: deleteError } = await supabase
      .from("push_subscriptions")
      .delete()
      .in("id", expiredIds);
    if (deleteError) {
      console.error("[PUSH_SEND] Cleanup error:", deleteError.message);
    }
  }

  // Update last_used_at for successful sends
  if (sent > 0) {
    const successEndpoints = subscriptions
      .filter((s) => !expiredIds.includes(s.id))
      .map((s) => s.id);
    if (successEndpoints.length > 0) {
      await supabase
        .from("push_subscriptions")
        .update({ last_used_at: new Date().toISOString() })
        .in("id", successEndpoints);
    }
  }

  return Response.json({ sent, failed, cleaned });
}
