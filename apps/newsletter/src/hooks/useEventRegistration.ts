"use client";

import { useState, useCallback } from "react";
import { basePath } from "@/lib/base-path";
import type { Gender } from "@/lib/validations";

type RegistrationState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "registered"; eventTitle: string; eventDate: string }
  | { kind: "pending_subscriber"; email: string }
  | { kind: "already_registered"; eventTitle: string; eventDate: string }
  | { kind: "no_subscriber" }
  | { kind: "pending_confirmation" }
  | { kind: "gender_required"; email: string; emailConfirmation: string }
  | { kind: "error"; message: string };

interface UseEventRegistrationReturn {
  state: RegistrationState;
  isSubmitting: boolean;
  register: (email: string, emailConfirmation: string) => Promise<void>;
  registerAndSubscribe: (email: string, name: string | undefined, gender: Gender) => Promise<void>;
  submitGender: (gender: Gender) => Promise<void>;
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
          setState({
            kind: "error",
            message: json.error ?? "Qualcosa non ha funzionato. Riprova tra qualche secondo.",
          });
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
          case "gender_required":
            setState({ kind: "gender_required", email, emailConfirmation });
            break;
          default:
            setState({ kind: "error", message: "Risposta non riconosciuta." });
        }
      } catch {
        setState({
          kind: "error",
          message: "Qualcosa non ha funzionato. Riprova tra qualche secondo.",
        });
      }
    },
    [eventId, state.kind],
  );

  const submitGender = useCallback(
    async (gender: Gender) => {
      if (state.kind !== "gender_required") return;

      const { email, emailConfirmation } = state;
      setState({ kind: "submitting" });
      try {
        const res = await fetch(`${basePath}/api/events/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId, email, emailConfirmation, gender }),
        });

        const json = await res.json();

        if (!res.ok) {
          setState({
            kind: "error",
            message: json.error ?? "Qualcosa non ha funzionato. Riprova tra qualche secondo.",
          });
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
          case "already_registered":
            setState({
              kind: "already_registered",
              eventTitle: json.eventTitle,
              eventDate: json.eventDate,
            });
            break;
          default:
            setState({ kind: "error", message: "Risposta non riconosciuta." });
        }
      } catch {
        setState({
          kind: "error",
          message: "Qualcosa non ha funzionato. Riprova tra qualche secondo.",
        });
      }
    },
    [eventId, state],
  );

  const registerAndSubscribe = useCallback(
    async (email: string, name: string | undefined, gender: Gender) => {
      if (state.kind === "submitting") return;

      setState({ kind: "submitting" });
      try {
        const res = await fetch(`${basePath}/api/events/register-and-subscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId, email, name, gender, consentVersion: "v1.0" }),
        });

        const json = await res.json();

        if (!res.ok) {
          setState({
            kind: "error",
            message: json.error ?? "Qualcosa non ha funzionato. Riprova tra qualche secondo.",
          });
          return;
        }

        switch (json.status) {
          case "pending_confirmation":
            setState({ kind: "pending_confirmation" });
            break;
          case "registered":
            setState({
              kind: "registered",
              eventTitle: json.eventTitle,
              eventDate: json.eventDate,
            });
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
          case "gender_required":
            setState({ kind: "gender_required", email, emailConfirmation: email });
            break;
          default:
            setState({ kind: "error", message: "Risposta non riconosciuta." });
        }
      } catch {
        setState({
          kind: "error",
          message: "Qualcosa non ha funzionato. Riprova tra qualche secondo.",
        });
      }
    },
    [eventId, state.kind],
  );

  const dismiss = useCallback(() => {
    setState({ kind: "idle" });
  }, []);

  return {
    state,
    isSubmitting: state.kind === "submitting",
    register,
    registerAndSubscribe,
    submitGender,
    dismiss,
  };
}
