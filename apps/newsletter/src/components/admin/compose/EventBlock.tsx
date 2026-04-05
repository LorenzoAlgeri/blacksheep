import { Plus, X, ChevronUp, ChevronDown } from "lucide-react";
import { ARTIST_ROLES, type EventEntry, type ArtistEntry } from "@/lib/email-template";

export function EventBlock({
  event,
  index,
  total,
  inputClass,
  labelClass,
  onUpdate,
  onRemove,
  onMove,
  onAddArtist,
  onRemoveArtist,
  onUpdateArtist,
}: {
  event: EventEntry;
  index: number;
  total: number;
  inputClass: string;
  labelClass: string;
  onUpdate: (patch: Partial<EventEntry>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  onAddArtist: () => void;
  onRemoveArtist: (artistId: string) => void;
  onUpdateArtist: (artistId: string, patch: Partial<ArtistEntry>) => void;
}) {
  return (
    <div className="pl-1 border-l-2 border-bs-gold/20 ml-2 relative">
      <div className="flex items-center justify-between pl-3 mb-2">
        <span className="font-[family-name:var(--font-brand)] text-[10px] tracking-[0.2em] text-bs-gold/50">
          EVENTO {index + 1}
        </span>
        <div className="flex items-center gap-1">
          {total > 1 && index > 0 && (
            <button
              onClick={() => onMove(-1)}
              className="text-bs-cream/20 hover:text-bs-cream/50 p-0.5 cursor-pointer"
            >
              <ChevronUp size={14} />
            </button>
          )}
          {total > 1 && index < total - 1 && (
            <button
              onClick={() => onMove(1)}
              className="text-bs-cream/20 hover:text-bs-cream/50 p-0.5 cursor-pointer"
            >
              <ChevronDown size={14} />
            </button>
          )}
          <button
            onClick={onRemove}
            className="text-bs-cream/20 hover:text-bs-burgundy p-0.5 ml-1 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-2.5 pl-3">
        <div>
          <label className={labelClass}>Titolo evento</label>
          <input
            type="text"
            value={event.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Orario</label>
          <input
            type="text"
            value={event.time}
            onChange={(e) => onUpdate({ time: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Location</label>
          <input
            type="text"
            value={event.location}
            onChange={(e) => onUpdate({ location: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Lineup</label>
          <div className="flex flex-col gap-1.5">
            {event.lineup.map((artist) => (
              <div key={artist.id} className="flex gap-1.5 items-center">
                <input
                  type="text"
                  value={artist.name}
                  onChange={(e) => onUpdateArtist(artist.id, { name: e.target.value })}
                  placeholder="Nome artista"
                  className={`${inputClass} flex-1`}
                />
                <select
                  value={artist.role}
                  onChange={(e) => onUpdateArtist(artist.id, { role: e.target.value })}
                  className="bg-transparent border border-bs-cream/10 rounded px-2 py-2.5 font-body text-[11px] text-bs-cream/50 focus:border-bs-cream/30 focus:outline-none transition-colors cursor-pointer appearance-none"
                >
                  {ARTIST_ROLES.map((r) => (
                    <option key={r} value={r} className="bg-black text-bs-cream">
                      {r}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => onRemoveArtist(artist.id)}
                  className="text-bs-cream/20 hover:text-bs-burgundy p-1 cursor-pointer flex-shrink-0"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            <button
              onClick={onAddArtist}
              className="flex items-center gap-1 text-bs-cream/20 hover:text-bs-cream/40 font-body text-[11px] tracking-wide py-1 transition-colors cursor-pointer"
            >
              <Plus size={12} /> AGGIUNGI ARTISTA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
