import type { Metadata } from "next";
import { ComposeEditor } from "@/components/admin/ComposeEditor";

export const metadata: Metadata = {
  title: "Invia Newsletter — BLACK SHEEP Admin",
  robots: { index: false, follow: false },
};

export default function ComposePage() {
  return (
    <div className="max-w-[480px]">
      <h1 className="font-[family-name:var(--font-brand)] text-xl tracking-wider text-bs-cream mb-4">
        INVIA NEWSLETTER
      </h1>
      <ComposeEditor />
    </div>
  );
}
