import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EventsTable } from "@/components/admin/EventsTable";

export const metadata: Metadata = {
  title: "Eventi — BLACK SHEEP Admin",
  robots: { index: false, follow: false },
};

export default function EventsAdminPage() {
  return (
    <div className="mx-auto max-w-2xl py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-[family-name:var(--font-brand)] text-xl tracking-wider text-bs-cream">
          EVENTI
        </h1>
        <Link
          href="/admin/events/new"
          className="font-body text-xs px-4 py-2 rounded border border-bs-cream/20 text-bs-cream hover:bg-bs-cream/10 transition-colors"
        >
          + NUOVO EVENTO
        </Link>
      </div>
      <Suspense fallback={<p className="font-body text-sm text-bs-cream/30">Caricamento...</p>}>
        <EventsTable />
      </Suspense>
    </div>
  );
}
