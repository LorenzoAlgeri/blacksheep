"use client";

import { useId, useState } from "react";
import { Dialog, DialogHeader, DialogContent, DialogFooter } from "@/components/dialog";

type ResendState =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent" }
  | { kind: "error"; message: string };

interface PendingConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  email: string;
  /** Callback to open the ContactHelpForm dialog (parent owns ContactHelp state). */
  onContactHelpClick: () => void;
}

/**
 * Shown when a user with `pending` status tries to register for an event.
 * Owns its own resend-confirmation state machine (idle | sending | sent | error)
 * so the parent doesn't need to track per-dialog fetch lifecycle.
 *
 * The "Scrivici" button delegates to onContactHelpClick — the parent mounts
 * ContactHelpForm in a separate dialog (Phase 9).
 *
 * Anti-spam disclaimer copy explicitly nudges users to mark "Non è spam"
 * if they find the confirmation in their spam folder — protects sender
 * reputation on Resend.
 */
export function PendingConfirmationDialog({
  open,
  onClose,
  email,
  onContactHelpClick,
}: PendingConfirmationDialogProps) {
  const titleId = useId();
  const descId = useId();
  const statusId = useId();
  const [resendState, setResendState] = useState<ResendState>({ kind: "idle" });

  const handleResend = async () => {
    setResendState({ kind: "sending" });
    try {
      const siteUrl = window.location.origin;
      const res = await fetch(`${siteUrl}/newsletter/api/events/resend-confirmation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const message =
          res.status === 429
            ? "Hai già richiesto un re-invio. Aspetta qualche minuto."
            : "Errore. Riprova tra poco.";
        setResendState({ kind: "error", message });
        return;
      }
      setResendState({ kind: "sent" });
    } catch {
      setResendState({ kind: "error", message: "Errore di rete. Riprova." });
    }
  };

  const resendLabel = resendState.kind === "sending" ? "Invio in corso..." : "Reinvia email";
  const resendDisabled = resendState.kind === "sending";

  return (
    <Dialog open={open} onClose={onClose} ariaLabelledBy={titleId} ariaDescribedBy={descId}>
      <DialogHeader id={titleId}>CONFERMA L&rsquo;EMAIL</DialogHeader>
      <DialogContent id={descId}>
        <p className="mb-4">
          Per evitare problemi di consegna, dobbiamo essere sicuri che la tua email funzioni
          davvero. Hai un&rsquo;email di conferma in sospeso — controlla la posta.
        </p>
        <p className="mb-4 text-xs text-bs-cream/45">
          Se non la trovi: cerca in <strong className="text-bs-cream/70">Spam</strong> o{" "}
          <strong className="text-bs-cream/70">Promozioni</strong>. Se la trovi lì, segnala
          &ldquo;Non è spam&rdquo; — ci aiuta a essere visibili ai prossimi iscritti.
        </p>
        {resendState.kind === "sent" || resendState.kind === "error" ? (
          <p
            id={statusId}
            role="status"
            aria-live="polite"
            className={`mt-4 text-xs ${
              resendState.kind === "sent" ? "text-bs-cream/65" : "text-bs-burgundy"
            }`}
          >
            {resendState.kind === "sent"
              ? "Email reinviata. Aspetta qualche minuto."
              : resendState.message}
          </p>
        ) : null}
      </DialogContent>
      <DialogFooter>
        <button
          type="button"
          onClick={onContactHelpClick}
          className="min-h-[44px] px-4 py-3 font-body text-xs uppercase tracking-[0.15em] text-bs-cream/55 underline underline-offset-4 hover:text-bs-cream transition-colors"
        >
          Scrivici
        </button>
        <button
          type="button"
          onClick={handleResend}
          disabled={resendDisabled}
          aria-busy={resendDisabled}
          className="min-h-[44px] px-6 py-3 bg-bs-cream text-[#0a0a0a] font-[family-name:var(--font-brand)] text-xs uppercase tracking-[0.15em] rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {resendLabel}
        </button>
      </DialogFooter>
    </Dialog>
  );
}
