import { getSupabase } from "@/lib/supabase";

export async function GET() {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("site_config")
    .select("tagline, venue")
    .eq("id", "main")
    .single();

  if (error || !data) {
    return Response.json(
      { tagline: "EVERY MONDAY", venue: "11 Clubroom · Corso Como · Milano" },
      { headers: { "Cache-Control": "no-cache, no-store" } },
    );
  }

  return Response.json(data, {
    headers: { "Cache-Control": "no-cache, no-store" },
  });
}
