import { ComposeEditor } from "@/components/admin/ComposeEditor";

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
