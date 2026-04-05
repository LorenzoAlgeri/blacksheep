import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!token || !UUID_RE.test(token)) {
    return Response.redirect(new URL("/?error=invalid", request.url));
  }

  const { data: subscriber } = await supabase
    .from("subscribers")
    .select("id, status")
    .eq("token", token)
    .single();

  if (!subscriber) {
    return Response.redirect(new URL("/?error=invalid", request.url));
  }

  if (subscriber.status === "confirmed") {
    return Response.redirect(new URL("/confirm?already=true", request.url));
  }

  const { error: updateError } = await supabase
    .from("subscribers")
    .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
    .eq("id", subscriber.id);

  if (updateError) {
    console.error("Confirm update error:", updateError);
    return Response.redirect(new URL("/?error=server", request.url));
  }

  return Response.redirect(new URL("/confirm", request.url));
}
