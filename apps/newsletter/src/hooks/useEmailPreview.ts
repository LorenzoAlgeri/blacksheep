import { useMemo } from "react";
import { buildEmailHtml, type EmailTemplateData } from "@/lib/email-template";
import type { EditorState } from "./useEmailComposer";

export function useEmailPreview(state: EditorState) {
  const templateData: EmailTemplateData = useMemo(
    () => ({
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
    }),
    [
      state.title,
      state.body,
      state.showPhoto,
      state.photoUrl,
      state.showEvents,
      state.events,
      state.showCta,
      state.ctaText,
      state.ctaLink,
      state.palette,
    ],
  );

  const emailHtml = useMemo(() => buildEmailHtml(templateData), [templateData]);

  return { templateData, emailHtml };
}
