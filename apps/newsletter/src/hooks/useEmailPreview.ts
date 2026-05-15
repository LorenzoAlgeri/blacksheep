import { useMemo } from "react";
import { buildEmailHtml, type EmailTemplateData } from "@/lib/email-template";
import type { EditorState } from "./useEmailComposer";

export function useEmailPreview(state: EditorState) {
  const templateData: EmailTemplateData = useMemo(
    () => ({
      title: state.title,
      body: state.body,
      headerTitle: state.headerTitle,
      headerTagline: state.headerTagline,
      showPhoto: state.showPhoto,
      photoUrl: state.photoUrl,
      showEvents: state.showEvents,
      events: state.events,
      showCta: state.showCta,
      ctaText: state.ctaText,
      ctaLink: state.ctaLink,
      showEventCta: state.showEventCta,
      eventCtaUrl: state.eventCtaUrl,
      eventCtaTitle: state.eventCtaTitle,
      unsubscribeUrl: "",
      palette: state.palette,
    }),
    [
      state.title,
      state.body,
      state.headerTitle,
      state.headerTagline,
      state.showPhoto,
      state.photoUrl,
      state.showEvents,
      state.events,
      state.showCta,
      state.ctaText,
      state.ctaLink,
      state.showEventCta,
      state.eventCtaUrl,
      state.eventCtaTitle,
      state.palette,
    ],
  );

  const emailHtml = useMemo(() => buildEmailHtml(templateData), [templateData]);

  return { templateData, emailHtml };
}
