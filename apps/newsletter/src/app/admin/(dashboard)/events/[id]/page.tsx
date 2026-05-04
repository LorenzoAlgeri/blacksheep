import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { EventForm } from "@/components/admin/EventForm";
import { getSupabase } from "@/lib/supabase";
export const metadata: Metadata = {
  title: "Modifica Evento — BLACK SHEEP Admin",
  robots: { index: false, follow: false },
};

type AdminEvent = {
  id: string;
  title: string;
  slug: string;
  event_date: string;
  venue: string;
  description: string | null;
  capacity: number | null;
  status: "draft" | "published" | "archived";
  published_at: string | null;
  created_at: string | null;
  created_by: string | null;
};

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabase();

  const { data } = await supabase.from("list_events").select("*").eq("id", id).maybeSingle();

  if (!data) notFound();

  const event = data as unknown as AdminEvent;

  return (
    <div className="mx-auto max-w-lg py-8">
      <h1 className="font-[family-name:var(--font-brand)] text-xl tracking-wider text-bs-cream mb-6">
        MODIFICA EVENTO
      </h1>
      <div className="mb-6">
        <Link
          href={`/admin/events/${event.id}/registrations`}
          className="font-body text-xs text-bs-cream/40 hover:text-bs-cream/70 transition-colors"
        >
          Vedi iscritti →
        </Link>
      </div>
      <EventForm mode="edit" defaultValues={event} eventId={event.id} />
    </div>
  );
}
