import { getSupabase } from "@/lib/supabase";

const PIXEL_GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==", "base64");

function pixelResponse() {
  return new Response(PIXEL_GIF, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

export async function GET(request: Request) {
  const supabase = getSupabase();
  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get("c");
  const subscriberToken = searchParams.get("t");

  if (!campaignId || !subscriberToken) {
    return pixelResponse();
  }

  const { data: recipientRow } = await supabase
    .from("newsletter_campaign_recipients")
    .select("campaign_id, opened_at")
    .eq("campaign_id", campaignId)
    .eq("subscriber_token", subscriberToken)
    .single();

  if (!recipientRow || recipientRow.opened_at) {
    return pixelResponse();
  }

  const { data: updatedRow } = await supabase
    .from("newsletter_campaign_recipients")
    .update({ opened_at: new Date().toISOString() })
    .eq("campaign_id", campaignId)
    .eq("subscriber_token", subscriberToken)
    .is("opened_at", null)
    .select("campaign_id")
    .single();

  if (updatedRow) {
    await supabase.rpc("increment_newsletter_open_count", { p_campaign_id: campaignId });
  }

  return pixelResponse();
}
