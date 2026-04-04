import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
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

  await supabase
    .from("subscribers")
    .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
    .eq("id", subscriber.id);

  return Response.redirect(new URL("/confirm", request.url));
}
