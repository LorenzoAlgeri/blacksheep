import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const { data: subscribers, error } = await supabase
    .from("subscribers")
    .select("id, email, name, status, created_at, confirmed_at")
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ error: "Errore database" }, { status: 500 });
  }

  return Response.json({ subscribers });
}
