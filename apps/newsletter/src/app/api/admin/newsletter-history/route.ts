import { auth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

function isMissingRelationError(message?: string) {
  const normalized = message?.toLowerCase() ?? "";
  return normalized.includes("relation") && normalized.includes("does not exist");
}

export async function GET() {
  try {
    const supabase = getSupabase();
    const session = await auth();

    if (!session) {
      return Response.json({ error: "Non autorizzato", code: "UNAUTHORIZED" }, { status: 401 });
    }

    const { data: campaigns, error } = await supabase
      .from("newsletter_campaigns")
      .select(
        "id, subject, source, recipient_count, sent_count, opened_unique_count, sent_at, created_at",
      )
      .order("sent_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      if (isMissingRelationError(error.message)) {
        return Response.json({ history: [], trackingAvailable: false });
      }

      console.error("[NEWSLETTER_HISTORY] DB error:", error.message);
      return Response.json({ error: "Errore database", code: "DB_ERROR" }, { status: 500 });
    }

    const history = (campaigns ?? []).map((campaign) => {
      const denominator = Number(campaign.recipient_count ?? 0);
      const opens = Number(campaign.opened_unique_count ?? 0);
      const openRate = denominator > 0 ? Math.round((opens / denominator) * 1000) / 10 : 0;

      return {
        id: String(campaign.id),
        subject: String(campaign.subject),
        source: String(campaign.source),
        recipientCount: denominator,
        sentCount: Number(campaign.sent_count ?? 0),
        uniqueOpens: opens,
        openRate,
        sentAt: campaign.sent_at,
        createdAt: campaign.created_at,
      };
    });

    return Response.json({ history, trackingAvailable: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[NEWSLETTER_HISTORY] Unexpected error:", message);
    return Response.json({ error: "Errore server", code: "SERVER_ERROR" }, { status: 500 });
  }
}
