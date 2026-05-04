"use client";

import { useId, useState } from "react";
import { useEventRegistration } from "@/hooks/useEventRegistration";
import { Dialog, DialogHeader, DialogContent } from "@/components/dialog";
import { EventRegistrationForm } from "./EventRegistrationForm";
import { RegistrationSuccessDialog } from "./dialogs/RegistrationSuccessDialog";
import { PendingConfirmationDialog } from "./dialogs/PendingConfirmationDialog";
import { AlreadyRegisteredDialog } from "./dialogs/AlreadyRegisteredDialog";
import { NoSubscriberDialog } from "./dialogs/NoSubscriberDialog";
import { GenderRequiredDialog } from "./dialogs/GenderRequiredDialog";
import { ContactHelpDialog } from "./ContactHelpDialog";
import type { EventCardData } from "./EventCard";

interface EventRegistrationFlowProps {
  event: EventCardData;
  onClose: () => void;
  onSubscribeClick: () => void;
}

export function EventRegistrationFlow({
  event,
  onClose,
  onSubscribeClick,
}: EventRegistrationFlowProps) {
  const titleId = useId();
  const descId = useId();
  const { state, isSubmitting, register, submitGender, dismiss } = useEventRegistration(event.id);
  const [showContactHelp, setShowContactHelp] = useState(false);

  function handleClose() {
    dismiss();
    onClose();
  }

  if (showContactHelp) {
    return (
      <ContactHelpDialog
        open
        onClose={() => setShowContactHelp(false)}
        email={state.kind === "pending_subscriber" ? state.email : ""}
      />
    );
  }

  if (state.kind === "registered") {
    return (
      <RegistrationSuccessDialog
        open
        onClose={handleClose}
        eventTitle={state.eventTitle}
        eventDate={state.eventDate}
        eventVenue={event.venue}
      />
    );
  }

  if (state.kind === "pending_subscriber") {
    return (
      <PendingConfirmationDialog
        open
        onClose={handleClose}
        email={state.email}
        onContactHelpClick={() => setShowContactHelp(true)}
      />
    );
  }

  if (state.kind === "already_registered") {
    return (
      <AlreadyRegisteredDialog
        open
        onClose={handleClose}
        eventTitle={state.eventTitle}
        eventDate={state.eventDate}
      />
    );
  }

  if (state.kind === "no_subscriber") {
    return <NoSubscriberDialog open onClose={handleClose} onSubscribeClick={onSubscribeClick} />;
  }

  if (state.kind === "gender_required") {
    return <GenderRequiredDialog open onSubmit={submitGender} onCancel={handleClose} />;
  }

  // idle | submitting | error — show form dialog
  return (
    <Dialog open onClose={handleClose} ariaLabelledBy={titleId} ariaDescribedBy={descId}>
      <DialogHeader id={titleId}>ENTRA IN LISTA</DialogHeader>
      <DialogContent id={descId}>
        <EventRegistrationForm
          onSubmit={register}
          isSubmitting={isSubmitting}
          error={state.kind === "error" ? state.message : null}
        />
      </DialogContent>
    </Dialog>
  );
}
