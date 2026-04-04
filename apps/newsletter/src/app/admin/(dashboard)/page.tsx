import { SubscriberTable } from "@/components/admin/SubscriberTable";

export default function AdminDashboardPage() {
  return (
    <div>
      <h1 className="font-[family-name:var(--font-brand)] text-xl tracking-wider text-bs-cream mb-4">ISCRITTI</h1>
      <SubscriberTable />
    </div>
  );
}
