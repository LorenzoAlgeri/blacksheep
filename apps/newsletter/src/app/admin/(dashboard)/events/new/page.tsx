import type { Metadata } from "next";
import { EventForm } from "@/components/admin/EventForm";

export const metadata: Metadata = {
  title: "Nuovo Evento — BLACK SHEEP Admin",
  robots: { index: false, follow: false },
};

export default function NewEventPage() {
  return (
    <div className="mx-auto max-w-lg py-8">
      <h1 className="font-[family-name:var(--font-brand)] text-xl tracking-wider text-bs-cream mb-6">
        NUOVO EVENTO
      </h1>
      <EventForm mode="create" />
    </div>
  );
}
