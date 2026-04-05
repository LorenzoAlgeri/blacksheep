import { useCallback } from "react";
import {
  makeDefaultEvent,
  makeDefaultArtist,
  type EventEntry,
  type ArtistEntry,
} from "@/lib/email-template";
import type { EditorState } from "./useEmailComposer";

const MAX_EVENTS = 4;

export function useEventEditor(
  state: EditorState,
  set: <K extends keyof EditorState>(key: K, value: EditorState[K]) => void,
) {
  const addEvent = useCallback(() => {
    if (state.events.length >= MAX_EVENTS) return;
    set("events", [...state.events, makeDefaultEvent()]);
  }, [state.events, set]);

  const removeEvent = useCallback(
    (id: string) => {
      set(
        "events",
        state.events.filter((ev) => ev.id !== id),
      );
    },
    [state.events, set],
  );

  const moveEvent = useCallback(
    (id: string, dir: -1 | 1) => {
      const idx = state.events.findIndex((ev) => ev.id === id);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= state.events.length) return;
      const next = [...state.events];
      [next[idx], next[target]] = [next[target], next[idx]];
      set("events", next);
    },
    [state.events, set],
  );

  const updateEvent = useCallback(
    (id: string, patch: Partial<EventEntry>) => {
      set(
        "events",
        state.events.map((ev) => (ev.id === id ? { ...ev, ...patch } : ev)),
      );
    },
    [state.events, set],
  );

  const addArtist = useCallback(
    (eventId: string) => {
      set(
        "events",
        state.events.map((ev) =>
          ev.id === eventId ? { ...ev, lineup: [...ev.lineup, makeDefaultArtist()] } : ev,
        ),
      );
    },
    [state.events, set],
  );

  const removeArtist = useCallback(
    (eventId: string, artistId: string) => {
      set(
        "events",
        state.events.map((ev) =>
          ev.id === eventId ? { ...ev, lineup: ev.lineup.filter((a) => a.id !== artistId) } : ev,
        ),
      );
    },
    [state.events, set],
  );

  const updateArtist = useCallback(
    (eventId: string, artistId: string, patch: Partial<ArtistEntry>) => {
      set(
        "events",
        state.events.map((ev) =>
          ev.id === eventId
            ? {
                ...ev,
                lineup: ev.lineup.map((a) => (a.id === artistId ? { ...a, ...patch } : a)),
              }
            : ev,
        ),
      );
    },
    [state.events, set],
  );

  return {
    addEvent,
    removeEvent,
    moveEvent,
    updateEvent,
    addArtist,
    removeArtist,
    updateArtist,
    maxEvents: MAX_EVENTS,
  };
}
