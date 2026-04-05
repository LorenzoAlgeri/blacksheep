import type { Metadata } from "next";
import { Suspense } from "react";
import { SubscriberTable } from "@/components/admin/SubscriberTable";

export const metadata: Metadata = {
  title: "Iscritti — BLACK SHEEP Admin",
  robots: { index: false, follow: false },
};

export default function AdminDashboardPage() {
  return (
    <div>
      <h1 className="font-[family-name:var(--font-brand)] text-xl tracking-wider text-bs-cream mb-4">
        ISCRITTI
      </h1>
      <Suspense fallback={<p className="font-body text-sm text-bs-cream/30">Caricamento...</p>}>
        <SubscriberTable />
      </Suspense>
    </div>
  );
}
