import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { EventPreviewClient } from "@/components/admin/EventPreviewClient";
import type { EventCardData } from "@/components/events/EventCard";

export const metadata: Metadata = {
  title: "Anteprima Evento — BLACK SHEEP Admin",
  robots: { index: false, follow: false },
};

type AdminEventPreview = EventCardData & {
  status: "draft" | "published" | "archived";
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EventPreviewPage({ params }: PageProps) {
  // Auth guard — same pattern as registrations page
  const session = await auth();
  if (!session) notFound();

  const { id } = await params;
  const supabase = getSupabase(); // service-role: bypasses RLS for draft/archived

  const { data } = await supabase
    .from("list_events")
    .select("id, slug, title, event_date, venue, description, capacity, status")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();

  const event = data as unknown as AdminEventPreview;

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="mx-auto max-w-3xl py-4" aria-label="Navigazione">
        <Link
          href="/admin/events"
          className="font-body text-xs text-bs-cream/40 hover:text-bs-cream/70 transition-colors"
        >
          ← Eventi
        </Link>
        <span className="font-body text-xs text-bs-cream/20 mx-2">/</span>
        <Link
          href={`/admin/events/${id}`}
          className="font-body text-xs text-bs-cream/40 hover:text-bs-cream/70 transition-colors"
        >
          {event.title}
        </Link>
        <span className="font-body text-xs text-bs-cream/20 mx-2">/</span>
        <span className="font-body text-xs text-bs-cream/25">Anteprima</span>
      </nav>

      <EventPreviewClient event={event} status={event.status} />
    </div>
  );
}
