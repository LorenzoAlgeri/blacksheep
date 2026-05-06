import type { Metadata } from "next";
import { Suspense } from "react";
import { SubscriberTable } from "@/components/admin/SubscriberTable";

export const metadata: Metadata = {
  title: "Iscritti — BLACK SHEEP Admin",
  robots: { index: false, follow: false },
};

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const params = await searchParams;
  const showFeatureDisabledNotice = params.notice === "feature_disabled";

  return (
    <div className="mx-auto max-w-2xl py-8">
      {showFeatureDisabledNotice && (
        <p
          role="status"
          className="mb-6 border border-bs-cream/20 bg-bs-cream/5 px-4 py-3 font-body text-sm text-bs-cream/60"
        >
          Feature non abilitata.
        </p>
      )}
      <h1 className="font-[family-name:var(--font-brand)] text-xl tracking-wider text-bs-cream mb-4">
        ISCRITTI
      </h1>
      <Suspense fallback={<p className="font-body text-sm text-bs-cream/30">Caricamento...</p>}>
        <SubscriberTable />
      </Suspense>
    </div>
  );
}
