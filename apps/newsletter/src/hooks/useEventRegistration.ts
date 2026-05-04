"use client";

import { useState, useCallback } from "react";
import { basePath } from "@/lib/base-path";

type RegistrationState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "registered"; eventTitle: string; eventDate: string }
  | { kind: "pending_subscriber"; email: string }
  | { kind: "already_registered"; eventTitle: string; eventDate: string }
  | { kind: "no_subscriber" }
  | { kind: "error"; message: string };

interface UseEventRegistrationReturn {
  state: RegistrationState;
  isSubmitting: boolean;
  register: (email: string, emailConfirmation: string) => Promise<void>;
  dismiss: () => void;
}

export function useEventRegistration(eventId: string): UseEventRegistrationReturn {
  const [state, setState] = useState<RegistrationState>({ kind: "idle" });

  const register = useCallback(
    async (email: string, emailConfirmation: string) => {
      if (state.kind === "submitting") return;

      setState({ kind: "submitting" });
      try {
        const res = await fetch(`${basePath}/api/events/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId, email, emailConfirmation }),
        });

        const json = await res.json();

        if (!res.ok) {
          setState({ kind: "error", message: json.error ?? "Errore. Riprova." });
          return;
        }

        switch (json.status) {
          case "registered":
            setState({
              kind: "registered",
              eventTitle: json.eventTitle,
              eventDate: json.eventDate,
            });
            break;
          case "pending_subscriber":
            setState({ kind: "pending_subscriber", email });
            break;
          case "already_registered":
            setState({
              kind: "already_registered",
              eventTitle: json.eventTitle,
              eventDate: json.eventDate,
            });
            break;
          case "no_subscriber":
            setState({ kind: "no_subscriber" });
            break;
          default:
            setState({ kind: "error", message: "Risposta non riconosciuta." });
        }
      } catch {
        setState({ kind: "error", message: "Errore di rete. Riprova." });
      }
    },
    [eventId, state.kind],
  );

  const dismiss = useCallback(() => {
    setState({ kind: "idle" });
  }, []);

  return { state, isSubmitting: state.kind === "submitting", register, dismiss };
}
