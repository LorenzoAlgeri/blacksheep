"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Send, Plus, X, ChevronUp, ChevronDown, RotateCcw, Clock, Upload } from "lucide-react";
import {
  buildEmailHtml,
  makeDefaultEvent,
  ARTIST_ROLES,
  PALETTE_PRESETS,
  type EventEntry,
  type ArtistEntry,
  type EmailTemplateData,
  type EmailPalette,
} from "@/lib/email-template";

const AUTOSAVE_KEY = "bs-compose-autosave";
const TEMPLATES_KEY = "bs-compose-templates";
const MAX_EVENTS = 4;
const AUTOSAVE_DEBOUNCE = 1000;
const AUTOSAVE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

const DEFAULTS = {
  subject: "Ci sei dentro. \u2014 BLACK SHEEP",
  title: "CI SEI DENTRO.",
  body: "Questa \u00e8 la prima newsletter di BLACK SHEEP.\nDa adesso riceverai lineup, date e contenuti esclusivi\nprima di chiunque altro.",
  ctaText: "SEGUICI SU IG",
  ctaLink: "https://instagram.com/blacksheep.community_",
};

interface EditorState {
  subject: string;
  title: string;
  body: string;
  showPhoto: boolean;
  photoUrl: string;
  showEvents: boolean;
  events: EventEntry[];
  showCta: boolean;
  ctaText: string;
  ctaLink: string;
  palette: EmailPalette;
}

interface SavedTemplate {
  name: string;
  state: EditorState;
  savedAt: string;
}

interface AutoSave {
  state: EditorState;
  savedAt: string;
}

function freshState(): EditorState {
  return {
    subject: DEFAULTS.subject,
    title: DEFAULTS.title,
    body: DEFAULTS.body,
    showPhoto: false,
    photoUrl: "",
    showEvents: true,
    events: [makeDefaultEvent()],
    showCta: true,
    ctaText: DEFAULTS.ctaText,
    ctaLink: DEFAULTS.ctaLink,
    palette: PALETTE_PRESETS[0].palette,
  };
}

function loadAutoSave(): EditorState | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    const parsed: AutoSave = JSON.parse(raw);
    const age = Date.now() - new Date(parsed.savedAt).getTime();
    if (age > AUTOSAVE_MAX_AGE) {
      localStorage.removeItem(AUTOSAVE_KEY);
      return null;
    }
    return { ...freshState(), ...parsed.state, palette: parsed.state.palette ?? PALETTE_PRESETS[0].palette };
  } catch {
    return null;
  }
}

function loadTemplates(): SavedTemplate[] {
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTemplates(templates: SavedTemplate[]) {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("it-IT", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ComposeEditor() {
  const [tab, setTab] = useState<"editor" | "preview" | "templates">("editor");
  const [state, setState] = useState<EditorState>(() => loadAutoSave() ?? freshState());
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("18:00");
  const [uploading, setUploading] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [templates, setTemplates] = useState<SavedTemplate[]>(loadTemplates);
  const [templateName, setTemplateName] = useState("");
  const [showSaveAs, setShowSaveAs] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-save on every state change (debounced)
  useEffect(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      const now = new Date().toISOString();
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ state, savedAt: now }));
      setLastSaved(now);
    }, AUTOSAVE_DEBOUNCE);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [state]);

  // Load subscriber count
  useEffect(() => {
    fetch("/api/admin/subscribers")
      .then((r) => r.json())
      .then((data) => {
        if (data.subscribers) {
          const confirmed = data.subscribers.filter(
            (s: { status: string }) => s.status === "confirmed",
          ).length;
          setSubscriberCount(confirmed);
        }
      })
      .catch(() => {});
  }, []);

  const set = useCallback(
    <K extends keyof EditorState>(key: K, value: EditorState[K]) => {
      setState((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  function resetToDefaults() {
    if (!window.confirm("Resettare l'editor ai valori di default?")) return;
    setState(freshState());
    localStorage.removeItem(AUTOSAVE_KEY);
    setLastSaved(null);
  }

  function saveAsTemplate() {
    const name = templateName.trim();
    if (!name) return;
    const existing = templates.findIndex((t) => t.name === name);
    const entry: SavedTemplate = { name, state, savedAt: new Date().toISOString() };
    let next: SavedTemplate[];
    if (existing >= 0) {
      next = templates.map((t, i) => (i === existing ? entry : t));
    } else {
      next = [entry, ...templates];
    }
    saveTemplates(next);
    setTemplates(next);
    setTemplateName("");
    setShowSaveAs(false);
    setResult(`Template "${name}" salvato.`);
    setTimeout(() => setResult(null), 2000);
  }

  function loadTemplate(t: SavedTemplate) {
    setState({ ...freshState(), ...t.state, palette: t.state.palette ?? PALETTE_PRESETS[0].palette });
    setTab("editor");
    setResult(`Template "${t.name}" caricato.`);
    setTimeout(() => setResult(null), 2000);
  }

  function deleteTemplate(idx: number) {
    const name = templates[idx].name;
    if (!window.confirm(`Eliminare il template "${name}"?`)) return;
    const next = templates.filter((_, i) => i !== idx);
    saveTemplates(next);
    setTemplates(next);
  }

  // Photo upload
  async function handleFileUpload(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setResult(`Errore: ${data.error}`);
      } else {
        set("photoUrl", data.url);
        set("showPhoto", true);
      }
    } catch {
      setResult("Errore upload.");
    } finally {
      setUploading(false);
    }
  }

  // Event helpers
  function addEvent() {
    if (state.events.length >= MAX_EVENTS) return;
    set("events", [...state.events, makeDefaultEvent()]);
  }

  function removeEvent(idx: number) {
    set(
      "events",
      state.events.filter((_, i) => i !== idx),
    );
  }

  function moveEvent(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= state.events.length) return;
    const next = [...state.events];
    [next[idx], next[target]] = [next[target], next[idx]];
    set("events", next);
  }

  function updateEvent(idx: number, patch: Partial<EventEntry>) {
    const next = state.events.map((ev, i) =>
      i === idx ? { ...ev, ...patch } : ev,
    );
    set("events", next);
  }

  // Artist helpers
  function addArtist(eventIdx: number) {
    const ev = state.events[eventIdx];
    updateEvent(eventIdx, {
      lineup: [...ev.lineup, { name: "", role: "DJ SET" }],
    });
  }

  function removeArtist(eventIdx: number, artistIdx: number) {
    const ev = state.events[eventIdx];
    updateEvent(eventIdx, {
      lineup: ev.lineup.filter((_, i) => i !== artistIdx),
    });
  }

  function updateArtist(
    eventIdx: number,
    artistIdx: number,
    patch: Partial<ArtistEntry>,
  ) {
    const ev = state.events[eventIdx];
    const lineup = ev.lineup.map((a, i) =>
      i === artistIdx ? { ...a, ...patch } : a,
    );
    updateEvent(eventIdx, { lineup });
  }

  // Build email
  const templateData: EmailTemplateData = {
    title: state.title,
    body: state.body,
    showPhoto: state.showPhoto,
    photoUrl: state.photoUrl,
    showEvents: state.showEvents,
    events: state.events,
    showCta: state.showCta,
    ctaText: state.ctaText,
    ctaLink: state.ctaLink,
    unsubscribeUrl: "",
    palette: state.palette,
  };
  const emailHtml = buildEmailHtml(templateData);

  async function handleSend() {
    if (!state.subject.trim() || !state.title.trim()) return;

    const confirmed = window.confirm(
      `Stai per inviare la newsletter "${state.subject}" a ${subscriberCount ?? "tutti gli"} iscritti confermati. Confermi?`,
    );
    if (!confirmed) return;

    setSending(true);
    setResult(null);

    try {
      const res = await fetch("/api/admin/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: state.subject, html: emailHtml }),
      });
      const data = await res.json();

      if (!res.ok) {
        setResult(`Errore: ${data.error}`);
      } else {
        setResult(`Inviata a ${data.sent}/${data.total} iscritti.`);
        localStorage.removeItem(AUTOSAVE_KEY);
        setState(freshState());
        setLastSaved(null);
      }
    } catch {
      setResult("Errore di rete.");
    } finally {
      setSending(false);
    }
  }

  async function handleSchedule() {
    if (!state.subject.trim() || !state.title.trim()) return;
    if (!scheduleDate || !scheduleTime) {
      setResult("Errore: seleziona data e ora.");
      return;
    }

    const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString();
    const confirmed = window.confirm(
      `Programmare l'invio per il ${scheduleDate} alle ${scheduleTime}?`,
    );
    if (!confirmed) return;

    setSending(true);
    setResult(null);

    try {
      const res = await fetch("/api/admin/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: state.subject,
          html: emailHtml,
          scheduledAt,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setResult(`Errore: ${data.error}`);
      } else {
        setResult(`Newsletter programmata per ${scheduleDate} alle ${scheduleTime}.`);
        localStorage.removeItem(AUTOSAVE_KEY);
        setState(freshState());
        setLastSaved(null);
      }
    } catch {
      setResult("Errore di rete.");
    } finally {
      setSending(false);
    }
  }

  const inputClass =
    "w-full bg-transparent border border-bs-cream/15 rounded px-3 py-2.5 font-body text-sm text-bs-cream placeholder:text-bs-cream/20 focus:border-bs-cream/30 focus:outline-none transition-colors";
  const labelClass =
    "font-body text-[11px] text-bs-cream/40 mb-1 block tracking-wide uppercase";

  return (
    <div className="flex flex-col gap-0">
      {/* Tab navigation + auto-save indicator */}
      <div className="flex items-end border-b border-bs-cream/10 mb-6">
        <div className="flex">
          {(["editor", "preview", "templates"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 font-[family-name:var(--font-brand)] text-xs tracking-[0.2em] transition-colors cursor-pointer ${
                tab === t
                  ? "text-bs-cream border-b-2 border-bs-cream -mb-px"
                  : "text-bs-cream/30 hover:text-bs-cream/50"
              }`}
            >
              {t === "templates" ? `BOZZE${templates.length ? ` (${templates.length})` : ""}` : t.toUpperCase()}
            </button>
          ))}
        </div>
        {lastSaved && (
          <span className="ml-auto font-body text-[10px] text-bs-cream/20 pb-2.5 whitespace-nowrap">
            salvata {formatTime(lastSaved)}
          </span>
        )}
      </div>

      {/* EDITOR TAB */}
      {tab === "editor" && (
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
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded border transition-all cursor-pointer ${
                      active
                        ? "border-bs-cream/40 bg-bs-cream/10"
                        : "border-bs-cream/8 hover:border-bs-cream/20"
                    }`}
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
                    <span className="font-body text-[10px] text-bs-cream/40 ml-0.5">
                      {preset.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <Divider />

          {/* Foto */}
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <Toggle
                checked={state.showPhoto}
                onChange={(v) => set("showPhoto", v)}
              />
              <span className={labelClass + " mb-0"}>Includi foto</span>
            </label>
            {state.showPhoto && (
              <div className="pl-1 border-l-2 border-bs-cream/8 ml-2">
                <div className="pl-3 flex flex-col gap-2.5">
                  {/* File upload */}
                  <div>
                    <label className={labelClass}>Carica file</label>
                    <label className={`flex items-center justify-center gap-2 border border-dashed border-bs-cream/15 rounded px-3 py-3 cursor-pointer hover:border-bs-cream/30 transition-colors ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
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
                          if (file) handleFileUpload(file);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                  {/* Or paste URL */}
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
                  {/* Preview thumbnail */}
                  {state.photoUrl && (
                    <div className="relative rounded overflow-hidden border border-bs-cream/10">
                      <img
                        src={state.photoUrl}
                        alt="Preview"
                        className="w-full h-32 object-cover opacity-80"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      <button
                        onClick={() => set("photoUrl", "")}
                        className="absolute top-1.5 right-1.5 bg-black/60 rounded p-1 text-bs-cream/60 hover:text-bs-cream cursor-pointer"
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
              <Toggle
                checked={state.showEvents}
                onChange={(v) => set("showEvents", v)}
              />
              <span className={labelClass + " mb-0"}>Includi eventi</span>
            </label>

            {state.showEvents && (
              <div className="flex flex-col gap-4">
                {state.events.map((ev, ei) => (
                  <EventBlock
                    key={ei}
                    event={ev}
                    index={ei}
                    total={state.events.length}
                    inputClass={inputClass}
                    labelClass={labelClass}
                    onUpdate={(patch) => updateEvent(ei, patch)}
                    onRemove={() => removeEvent(ei)}
                    onMove={(dir) => moveEvent(ei, dir)}
                    onAddArtist={() => addArtist(ei)}
                    onRemoveArtist={(ai) => removeArtist(ei, ai)}
                    onUpdateArtist={(ai, patch) => updateArtist(ei, ai, patch)}
                  />
                ))}

                {state.events.length < MAX_EVENTS && (
                  <button
                    onClick={addEvent}
                    className="flex items-center justify-center gap-1.5 text-bs-cream/30 hover:text-bs-cream/50 font-[family-name:var(--font-brand)] text-[11px] tracking-[0.15em] py-2 transition-colors cursor-pointer"
                  >
                    <Plus size={14} />
                    AGGIUNGI EVENTO
                  </button>
                )}
              </div>
            )}
          </div>

          <Divider />

          {/* CTA */}
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <Toggle
                checked={state.showCta}
                onChange={(v) => set("showCta", v)}
              />
              <span className={labelClass + " mb-0"}>Includi bottone</span>
            </label>

            {state.showCta && (
              <div className="flex flex-col gap-3 pl-1 border-l-2 border-bs-cream/8 ml-2">
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
          {subscriberCount !== null && (
            <p className="font-body text-xs text-bs-cream/30 text-center py-1">
              Questa newsletter verr&agrave; inviata a{" "}
              <span className="text-bs-cream/60 font-medium">
                {subscriberCount}
              </span>{" "}
              iscritti confermati
            </p>
          )}

          {/* Schedule toggle */}
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <Toggle checked={showSchedule} onChange={setShowSchedule} />
              <span className={labelClass + " mb-0"}>Programma invio</span>
            </label>

            {showSchedule && (
              <div className="flex gap-3 pl-1 border-l-2 border-bs-cream/8 ml-2">
                <div className="pl-3 flex-1">
                  <label htmlFor="nl-sched-date" className={labelClass}>
                    Data
                  </label>
                  <input
                    id="nl-sched-date"
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
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
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
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
                onKeyDown={(e) => e.key === "Enter" && saveAsTemplate()}
                autoFocus
              />
              <button
                onClick={saveAsTemplate}
                disabled={!templateName.trim()}
                className="font-[family-name:var(--font-brand)] text-xs tracking-[0.1em] bg-bs-cream/10 text-bs-cream/60 px-4 py-2.5 rounded hover:bg-bs-cream/15 transition-colors disabled:opacity-30 cursor-pointer"
              >
                SALVA
              </button>
              <button
                onClick={() => { setShowSaveAs(false); setTemplateName(""); }}
                className="text-bs-cream/30 hover:text-bs-cream/50 p-2.5 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setShowSaveAs(true)}
                className="flex items-center justify-center gap-1.5 bg-bs-cream/10 text-bs-cream/50 font-[family-name:var(--font-brand)] text-[11px] tracking-[0.1em] py-2.5 px-4 rounded hover:bg-bs-cream/15 transition-colors cursor-pointer"
              >
                SALVA COME TEMPLATE
              </button>
              <button
                onClick={resetToDefaults}
                className="flex items-center justify-center gap-1 text-bs-cream/25 hover:text-bs-cream/40 font-body text-[11px] py-2.5 px-3 transition-colors cursor-pointer"
              >
                <RotateCcw size={12} />
                RESET
              </button>
            </div>
          )}

          <Divider />

          {/* Action buttons */}
          {showSchedule ? (
            <button
              onClick={handleSchedule}
              disabled={sending || !state.subject.trim() || !state.title.trim() || !scheduleDate}
              className="w-full flex items-center justify-center gap-2 bg-bs-cream text-black font-[family-name:var(--font-brand)] text-sm tracking-[0.15em] py-3.5 rounded hover:bg-bs-cream/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <Clock size={16} />
              {sending ? "..." : "PROGRAMMA"}
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={sending || !state.subject.trim() || !state.title.trim()}
              className="w-full flex items-center justify-center gap-2 bg-bs-cream text-black font-[family-name:var(--font-brand)] text-sm tracking-[0.15em] py-3.5 rounded hover:bg-bs-cream/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <Send size={16} />
              {sending ? "INVIO IN CORSO..." : "INVIA NEWSLETTER"}
            </button>
          )}

          {result && (
            <p
              className={`font-body text-sm text-center ${
                result.startsWith("Errore")
                  ? "text-bs-burgundy"
                  : "text-bs-green"
              }`}
            >
              {result}
            </p>
          )}
        </div>
      )}

      {/* PREVIEW TAB */}
      {tab === "preview" && (
        <div className="rounded border border-bs-cream/10 overflow-hidden">
          <div dangerouslySetInnerHTML={{ __html: emailHtml }} />
        </div>
      )}

      {/* TEMPLATES TAB */}
      {tab === "templates" && (
        <div className="flex flex-col gap-3">
          {templates.length === 0 ? (
            <div className="text-center py-12">
              <p className="font-body text-sm text-bs-cream/30">
                Nessun template salvato.
              </p>
              <p className="font-body text-xs text-bs-cream/20 mt-2">
                Usa &ldquo;Salva come template&rdquo; nell&apos;editor per salvare la configurazione corrente.
              </p>
            </div>
          ) : (
            templates.map((t, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-bs-cream/5 border border-bs-cream/8 rounded px-4 py-3 group"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-[family-name:var(--font-brand)] text-xs tracking-[0.1em] text-bs-cream truncate">
                    {t.name}
                  </p>
                  <p className="font-body text-[10px] text-bs-cream/25 mt-0.5">
                    {formatTime(t.savedAt)} &middot; {t.state.subject}
                  </p>
                </div>
                <div className="flex gap-1.5 ml-3 opacity-50 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => loadTemplate(t)}
                    className="font-body text-[11px] text-bs-cream bg-bs-cream/10 px-3 py-1.5 rounded hover:bg-bs-cream/20 transition-colors cursor-pointer"
                  >
                    Carica
                  </button>
                  <button
                    onClick={() => deleteTemplate(i)}
                    className="text-bs-cream/30 hover:text-bs-burgundy p-1.5 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Result message (visible in all tabs) */}
      {result && tab !== "editor" && (
        <p
          className={`font-body text-sm text-center mt-4 ${
            result.startsWith("Errore") ? "text-bs-burgundy" : "text-bs-green"
          }`}
        >
          {result}
        </p>
      )}
    </div>
  );
}

// --- Sub-components ---

function Divider() {
  return <div className="h-px bg-bs-cream/8" />;
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer flex-shrink-0 ${
        checked ? "bg-bs-cream/30" : "bg-bs-cream/10"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform ${
          checked
            ? "translate-x-4 bg-bs-cream"
            : "translate-x-0 bg-bs-cream/40"
        }`}
      />
    </button>
  );
}

function EventBlock({
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
  onRemoveArtist: (i: number) => void;
  onUpdateArtist: (i: number, patch: Partial<ArtistEntry>) => void;
}) {
  return (
    <div className="pl-1 border-l-2 border-bs-gold/20 ml-2 relative">
      {/* Event header */}
      <div className="flex items-center justify-between pl-3 mb-2">
        <span className="font-[family-name:var(--font-brand)] text-[10px] tracking-[0.2em] text-bs-gold/60">
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

        {/* Lineup builder */}
        <div>
          <label className={labelClass}>Lineup</label>
          <div className="flex flex-col gap-1.5">
            {event.lineup.map((artist, ai) => (
              <div key={ai} className="flex gap-1.5 items-center">
                <input
                  type="text"
                  value={artist.name}
                  onChange={(e) =>
                    onUpdateArtist(ai, { name: e.target.value })
                  }
                  placeholder="Nome artista"
                  className={`${inputClass} flex-1`}
                />
                <select
                  value={artist.role}
                  onChange={(e) =>
                    onUpdateArtist(ai, { role: e.target.value })
                  }
                  className="bg-transparent border border-bs-cream/15 rounded px-2 py-2.5 font-body text-[11px] text-bs-cream/60 focus:border-bs-cream/30 focus:outline-none transition-colors cursor-pointer appearance-none"
                >
                  {ARTIST_ROLES.map((r) => (
                    <option key={r} value={r} className="bg-black text-bs-cream">
                      {r}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => onRemoveArtist(ai)}
                  className="text-bs-cream/20 hover:text-bs-burgundy p-1 cursor-pointer flex-shrink-0"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            <button
              onClick={onAddArtist}
              className="flex items-center gap-1 text-bs-cream/25 hover:text-bs-cream/40 font-body text-[11px] tracking-wide py-1 transition-colors cursor-pointer"
            >
              <Plus size={12} />
              AGGIUNGI ARTISTA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
