import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return Response.redirect(new URL("/?error=invalid", request.url));
  }

  const { data: subscriber } = await supabase
    .from("subscribers")
    .select("id")
    .eq("token", token)
    .single();

  if (!subscriber) {
    return Response.redirect(new URL("/?error=invalid", request.url));
  }

  await supabase
    .from("subscribers")
    .update({ status: "unsubscribed" })
    .eq("id", subscriber.id);

  return Response.redirect(new URL("/unsubscribe", request.url));
}
