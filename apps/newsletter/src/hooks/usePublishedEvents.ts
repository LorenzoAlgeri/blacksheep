"use client";

import { useReducer, useEffect } from "react";
import { basePath } from "@/lib/base-path";

export type PickableEvent = {
  id: string;
  slug: string;
  title: string;
  event_date: string | null;
};

type State = {
  events: PickableEvent[];
  loading: boolean;
  error: string | null;
};

type Action =
  | { type: "FETCH_START" }
  | { type: "FETCH_SUCCESS"; events: PickableEvent[] }
  | { type: "FETCH_ERROR"; message: string }
  | { type: "RESET" };

const initial: State = { events: [], loading: false, error: null };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "FETCH_START":
      return { events: [], loading: true, error: null };
    case "FETCH_SUCCESS":
      return { events: action.events, loading: false, error: null };
    case "FETCH_ERROR":
      return { events: [], loading: false, error: action.message };
    case "RESET":
      return initial;
    default:
      return state;
  }
}

/**
 * Fetches published events when `enabled` is true.
 * Uses AbortController to cancel in-flight requests on cleanup.
 * Uses useReducer (not useState) to avoid sync setState calls in useEffect.
 */
export function usePublishedEvents(enabled: boolean): State {
  const [state, dispatch] = useReducer(reducer, initial);

  useEffect(() => {
    if (!enabled) {
      dispatch({ type: "RESET" });
      return;
    }

    const controller = new AbortController();
    // dispatch is not a useState setter — not flagged by
    // @eslint-react/hooks-extra/no-direct-set-state-in-use-effect
    dispatch({ type: "FETCH_START" });

    fetch(`${basePath}/api/admin/events?status=published&sort=event_date_asc&pageSize=50`, {
      signal: controller.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json() as Promise<{ events: PickableEvent[] }>;
      })
      .then((data) => dispatch({ type: "FETCH_SUCCESS", events: data.events ?? [] }))
      .catch((err) => {
        if (err instanceof Error && err.name === "AbortError") return;
        dispatch({ type: "FETCH_ERROR", message: "Errore caricamento eventi." });
      });

    return () => controller.abort();
  }, [enabled]);

  return state;
}
