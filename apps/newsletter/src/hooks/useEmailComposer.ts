import { useState, useCallback, useEffect, useRef } from "react";
import {
  makeDefaultEvent,
  PALETTE_PRESETS,
  type EventEntry,
  type EmailPalette,
} from "@/lib/email-template";

const AUTOSAVE_KEY = "bs-compose-autosave";
const TEMPLATES_KEY = "bs-compose-templates";
const AUTOSAVE_DEBOUNCE = 1000;
const AUTOSAVE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface EditorState {
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

export interface SavedTemplate {
  name: string;
  state: EditorState;
  savedAt: string;
}

interface AutoSave {
  state: EditorState;
  savedAt: string;
}

const DEFAULTS = {
  subject: "Ci sei dentro. \u2014 BLACK SHEEP",
  title: "CI SEI DENTRO.",
  body: "Questa \u00e8 la prima newsletter di BLACK SHEEP.\nDa adesso riceverai lineup, date e contenuti esclusivi\nprima di chiunque altro.",
  ctaText: "SEGUICI SU IG",
  ctaLink: "https://instagram.com/blacksheep.community_",
};

export function freshState(): EditorState {
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
    return {
      ...freshState(),
      ...parsed.state,
      palette: parsed.state.palette ?? PALETTE_PRESETS[0].palette,
    };
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

function persistTemplates(templates: SavedTemplate[]) {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
}

export function useEmailComposer() {
  const [state, setState] = useState<EditorState>(() => loadAutoSave() ?? freshState());
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [templates, setTemplates] = useState<SavedTemplate[]>(loadTemplates);
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

  const set = useCallback(<K extends keyof EditorState>(key: K, value: EditorState[K]) => {
    setState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetToDefaults = useCallback(() => {
    if (!window.confirm("Resettare l'editor ai valori di default?")) return;
    setState(freshState());
    localStorage.removeItem(AUTOSAVE_KEY);
    setLastSaved(null);
  }, []);

  const clearAutoSave = useCallback(() => {
    localStorage.removeItem(AUTOSAVE_KEY);
    setState(freshState());
    setLastSaved(null);
  }, []);

  const saveAsTemplate = useCallback(
    (name: string) => {
      const existing = templates.findIndex((t) => t.name === name);
      const entry: SavedTemplate = { name, state, savedAt: new Date().toISOString() };
      let next: SavedTemplate[];
      if (existing >= 0) {
        next = templates.map((t, i) => (i === existing ? entry : t));
      } else {
        next = [entry, ...templates];
      }
      persistTemplates(next);
      setTemplates(next);
    },
    [state, templates],
  );

  const loadTemplate = useCallback((t: SavedTemplate) => {
    setState({
      ...freshState(),
      ...t.state,
      palette: t.state.palette ?? PALETTE_PRESETS[0].palette,
    });
  }, []);

  const deleteTemplate = useCallback(
    (idx: number) => {
      const name = templates[idx].name;
      if (!window.confirm(`Eliminare il template "${name}"?`)) return false;
      const next = templates.filter((_, i) => i !== idx);
      persistTemplates(next);
      setTemplates(next);
      return true;
    },
    [templates],
  );

  return {
    state,
    setState,
    set,
    lastSaved,
    templates,
    resetToDefaults,
    clearAutoSave,
    saveAsTemplate,
    loadTemplate,
    deleteTemplate,
  };
}
