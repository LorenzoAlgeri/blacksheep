import { X } from "lucide-react";
import type { SavedTemplate } from "@/hooks/useEmailComposer";
import { formatTime } from "./shared";

export function TemplatesTab({
  templates,
  onLoad,
  onDelete,
}: {
  templates: SavedTemplate[];
  onLoad: (t: SavedTemplate) => void;
  onDelete: (idx: number) => void;
}) {
  if (templates.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="font-body text-sm text-bs-cream/30">Nessun template salvato.</p>
        <p className="font-body text-xs text-bs-cream/20 mt-2">
          Usa &ldquo;Salva come template&rdquo; nell&apos;editor per salvare la configurazione
          corrente.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {templates.map((t, i) => (
        <div
          key={t.name + t.savedAt}
          className="flex items-center justify-between bg-bs-cream/5 border border-bs-cream/10 rounded px-4 py-3 group"
        >
          <div className="flex-1 min-w-0">
            <p className="font-[family-name:var(--font-brand)] text-xs tracking-[0.1em] text-bs-cream truncate">
              {t.name}
            </p>
            <p className="font-body text-[10px] text-bs-cream/20 mt-0.5">
              {formatTime(t.savedAt)} &middot; {t.state.subject}
            </p>
          </div>
          <div className="flex gap-1.5 ml-3 opacity-50 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onLoad(t)}
              className="font-body text-[11px] text-bs-cream bg-bs-cream/10 px-3 py-1.5 rounded hover:bg-bs-cream/20 transition-colors cursor-pointer"
            >
              Carica
            </button>
            <button
              onClick={() => onDelete(i)}
              className="text-bs-cream/30 hover:text-bs-burgundy p-1.5 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
