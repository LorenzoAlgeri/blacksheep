import { Send, Plus, X, Upload, RotateCcw, Clock } from "lucide-react";
import { PALETTE_PRESETS } from "@/lib/email-template";
import type { useEmailComposer } from "@/hooks/useEmailComposer";
import type { useEventEditor } from "@/hooks/useEventEditor";
import type { useEmailSender } from "@/hooks/useEmailSender";
import { Divider, Toggle } from "./shared";
import { EventBlock } from "./EventBlock";

export function EditorTab({
  state,
  set,
  events,
  sender,
  uploading,
  onFileUpload,
  showSaveAs,
  setShowSaveAs,
  templateName,
  setTemplateName,
  onSaveAsTemplate,
  onResetToDefaults,
  onSend,
  onSchedule,
  inputClass,
  labelClass,
}: {
  state: ReturnType<typeof useEmailComposer>["state"];
  set: ReturnType<typeof useEmailComposer>["set"];
  events: ReturnType<typeof useEventEditor>;
  sender: ReturnType<typeof useEmailSender>;
  uploading: boolean;
  onFileUpload: (file: File) => void;
  showSaveAs: boolean;
  setShowSaveAs: (v: boolean) => void;
  templateName: string;
  setTemplateName: (v: string) => void;
  onSaveAsTemplate: () => void;
  onResetToDefaults: () => void;
  onSend: () => void;
  onSchedule: () => void;
  inputClass: string;
  labelClass: string;
}) {
  return (
    <div className="flex flex-col gap-5">
      {/* Oggetto */}
      <div>
        <label htmlFor="nl-subject" className={labelClass}>
          Oggetto
        </label>
        <input
          id="nl-subject"
          type="text"
          value={state.subject}
          onChange={(e) => set("subject", e.target.value)}
          placeholder="Oggetto della newsletter"
          className={inputClass}
        />
      </div>

      {/* Titolo */}
      <div>
        <label htmlFor="nl-title" className={labelClass}>
          Titolo
        </label>
        <input
          id="nl-title"
          type="text"
          value={state.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Titolo principale nell'email"
          className={inputClass}
        />
      </div>

      {/* Messaggio */}
      <div>
        <label htmlFor="nl-body" className={labelClass}>
          Messaggio
        </label>
        <textarea
          id="nl-body"
          value={state.body}
          onChange={(e) => set("body", e.target.value)}
          placeholder="Corpo del messaggio..."
          rows={5}
          className={`${inputClass} resize-y`}
        />
      </div>

      <Divider />

      {/* Palette picker */}
      <div>
        <label className={labelClass}>Palette colori</label>
        <div className="flex gap-2 flex-wrap">
          {PALETTE_PRESETS.map((preset) => {
            const active =
              state.palette.bg === preset.palette.bg &&
              state.palette.text === preset.palette.text &&
              state.palette.accent === preset.palette.accent;
            return (
              <button
                key={preset.name}
                onClick={() => set("palette", preset.palette)}
                title={preset.name}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded border transition-all cursor-pointer ${active ? "border-bs-cream/40 bg-bs-cream/10" : "border-bs-cream/10 hover:border-bs-cream/20"}`}
              >
                <span
                  className="w-3.5 h-3.5 rounded-full border border-white/10"
                  style={{ background: preset.palette.bg }}
                />
                <span
                  className="w-3.5 h-3.5 rounded-full border border-white/10"
                  style={{ background: preset.palette.text }}
                />
                <span
                  className="w-3.5 h-3.5 rounded-full border border-white/10"
                  style={{ background: preset.palette.accent }}
                />
                <span className="font-body text-[10px] text-bs-cream/40 ml-0.5">{preset.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <Divider />

      {/* Foto */}
      <div className="flex flex-col gap-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <Toggle checked={state.showPhoto} onChange={(v) => set("showPhoto", v)} />
          <span className={labelClass + " mb-0"}>Includi foto</span>
        </label>
        {state.showPhoto && (
          <div className="pl-1 border-l-2 border-bs-cream/10 ml-2">
            <div className="pl-3 flex flex-col gap-2.5">
              <div>
                <label className={labelClass}>Carica file</label>
                <label
                  className={`flex items-center justify-center gap-2 border border-dashed border-bs-cream/10 rounded px-3 py-3 cursor-pointer hover:border-bs-cream/30 transition-colors ${uploading ? "opacity-50 pointer-events-none" : ""}`}
                >
                  <Upload size={14} className="text-bs-cream/40" />
                  <span className="font-body text-xs text-bs-cream/40">
                    {uploading ? "Caricamento..." : "JPG, PNG, WebP, GIF — max 5MB"}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onFileUpload(file);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              <div>
                <label htmlFor="nl-photo" className={labelClass}>
                  Oppure incolla URL
                </label>
                <input
                  id="nl-photo"
                  type="text"
                  value={state.photoUrl}
                  onChange={(e) => set("photoUrl", e.target.value)}
                  placeholder="https://..."
                  className={inputClass}
                />
              </div>
              {state.photoUrl && (
                <div className="relative rounded overflow-hidden border border-bs-cream/10">
                  <img
                    src={state.photoUrl}
                    alt="Preview"
                    className="w-full h-32 object-cover opacity-90"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <button
                    onClick={() => set("photoUrl", "")}
                    className="absolute top-1.5 right-1.5 bg-black/50 rounded p-1 text-bs-cream/50 hover:text-bs-cream cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <Divider />

      {/* Eventi */}
      <div className="flex flex-col gap-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <Toggle checked={state.showEvents} onChange={(v) => set("showEvents", v)} />
          <span className={labelClass + " mb-0"}>Includi eventi</span>
        </label>
        {state.showEvents && (
          <div className="flex flex-col gap-4">
            {state.events.map((ev, ei) => (
              <EventBlock
                key={ev.id}
                event={ev}
                index={ei}
                total={state.events.length}
                inputClass={inputClass}
                labelClass={labelClass}
                onUpdate={(patch) => events.updateEvent(ev.id, patch)}
                onRemove={() => events.removeEvent(ev.id)}
                onMove={(dir) => events.moveEvent(ev.id, dir)}
                onAddArtist={() => events.addArtist(ev.id)}
                onRemoveArtist={(artistId) => events.removeArtist(ev.id, artistId)}
                onUpdateArtist={(artistId, patch) => events.updateArtist(ev.id, artistId, patch)}
              />
            ))}
            {state.events.length < events.maxEvents && (
              <button
                onClick={events.addEvent}
                className="flex items-center justify-center gap-1.5 text-bs-cream/30 hover:text-bs-cream/50 font-[family-name:var(--font-brand)] text-[11px] tracking-[0.15em] py-2 transition-colors cursor-pointer"
              >
                <Plus size={14} /> AGGIUNGI EVENTO
              </button>
            )}
          </div>
        )}
      </div>

      <Divider />

      {/* CTA */}
      <div className="flex flex-col gap-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <Toggle checked={state.showCta} onChange={(v) => set("showCta", v)} />
          <span className={labelClass + " mb-0"}>Includi bottone</span>
        </label>
        {state.showCta && (
          <div className="flex flex-col gap-3 pl-1 border-l-2 border-bs-cream/10 ml-2">
            <div className="pl-3">
              <label htmlFor="nl-cta-text" className={labelClass}>
                Testo bottone
              </label>
              <input
                id="nl-cta-text"
                type="text"
                value={state.ctaText}
                onChange={(e) => set("ctaText", e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="pl-3">
              <label htmlFor="nl-cta-link" className={labelClass}>
                Link bottone
              </label>
              <input
                id="nl-cta-link"
                type="text"
                value={state.ctaLink}
                onChange={(e) => set("ctaLink", e.target.value)}
                placeholder="https://..."
                className={inputClass}
              />
            </div>
          </div>
        )}
      </div>

      <Divider />

      {/* Subscriber count */}
      {sender.subscriberCount !== null && (
        <p className="font-body text-xs text-bs-cream/30 text-center py-1">
          Questa newsletter verr&agrave; inviata a{" "}
          <span className="text-bs-cream/50 font-medium">{sender.subscriberCount}</span> iscritti
          confermati
        </p>
      )}

      {/* Schedule toggle */}
      <div className="flex flex-col gap-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <Toggle checked={sender.showSchedule} onChange={sender.setShowSchedule} />
          <span className={labelClass + " mb-0"}>Programma invio</span>
        </label>
        {sender.showSchedule && (
          <div className="flex gap-3 pl-1 border-l-2 border-bs-cream/10 ml-2">
            <div className="pl-3 flex-1">
              <label htmlFor="nl-sched-date" className={labelClass}>
                Data
              </label>
              <input
                id="nl-sched-date"
                type="date"
                value={sender.scheduleDate}
                onChange={(e) => sender.setScheduleDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="flex-1">
              <label htmlFor="nl-sched-time" className={labelClass}>
                Ora
              </label>
              <input
                id="nl-sched-time"
                type="time"
                value={sender.scheduleTime}
                onChange={(e) => sender.setScheduleTime(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        )}
      </div>

      {/* Save as template */}
      {showSaveAs ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Nome template..."
            className={`${inputClass} flex-1`}
            onKeyDown={(e) => e.key === "Enter" && onSaveAsTemplate()}
            autoFocus
          />
          <button
            onClick={onSaveAsTemplate}
            disabled={!templateName.trim()}
            className="font-[family-name:var(--font-brand)] text-xs tracking-[0.1em] bg-bs-cream/10 text-bs-cream/50 px-4 py-2.5 rounded hover:bg-bs-cream/20 transition-colors disabled:opacity-30 cursor-pointer"
          >
            SALVA
          </button>
          <button
            onClick={() => {
              setShowSaveAs(false);
              setTemplateName("");
            }}
            className="text-bs-cream/30 hover:text-bs-cream/50 p-2.5 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => setShowSaveAs(true)}
            className="flex items-center justify-center gap-1.5 bg-bs-cream/10 text-bs-cream/50 font-[family-name:var(--font-brand)] text-[11px] tracking-[0.1em] py-2.5 px-4 rounded hover:bg-bs-cream/20 transition-colors cursor-pointer"
          >
            SALVA COME TEMPLATE
          </button>
          <button
            onClick={onResetToDefaults}
            className="flex items-center justify-center gap-1 text-bs-cream/20 hover:text-bs-cream/40 font-body text-[11px] py-2.5 px-3 transition-colors cursor-pointer"
          >
            <RotateCcw size={12} /> RESET
          </button>
        </div>
      )}

      <Divider />

      {/* Action buttons */}
      {sender.showSchedule ? (
        <button
          onClick={onSchedule}
          disabled={
            sender.sending || !state.subject.trim() || !state.title.trim() || !sender.scheduleDate
          }
          className="w-full flex items-center justify-center gap-2 bg-bs-cream text-black font-[family-name:var(--font-brand)] text-sm tracking-[0.15em] py-3.5 rounded hover:bg-bs-cream/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          <Clock size={16} />
          {sender.sending ? "..." : "PROGRAMMA"}
        </button>
      ) : (
        <button
          onClick={onSend}
          disabled={sender.sending || !state.subject.trim() || !state.title.trim()}
          className="w-full flex items-center justify-center gap-2 bg-bs-cream text-black font-[family-name:var(--font-brand)] text-sm tracking-[0.15em] py-3.5 rounded hover:bg-bs-cream/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          <Send size={16} />
          {sender.sending ? "INVIO IN CORSO..." : "INVIA NEWSLETTER"}
        </button>
      )}

      {sender.result && (
        <p
          className={`font-body text-sm text-center ${sender.result.startsWith("Errore") ? "text-bs-burgundy" : "text-bs-green"}`}
        >
          {sender.result}
        </p>
      )}
    </div>
  );
}
