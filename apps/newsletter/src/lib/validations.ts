import { z } from "zod/v4";

export const subscribeSchema = z.object({
  email: z.email("Inserisci un'email valida"),
  name: z.string().max(100).optional(),
  website: z.string().optional(), // honeypot: any value allowed, checked in route
});

export const sendNewsletterSchema = z.object({
  subject: z.string().min(1, "Oggetto obbligatorio").max(200),
  html: z.string().min(1, "Contenuto obbligatorio").max(200000),
});

export const scheduleNewsletterSchema = z.object({
  subject: z.string().min(1, "Oggetto obbligatorio").max(200),
  html: z.string().min(1, "Contenuto obbligatorio").max(200000),
  scheduledAt: z.string().min(1, "Data obbligatoria"),
});

export type SubscribeInput = z.infer<typeof subscribeSchema>;
export type SendNewsletterInput = z.infer<typeof sendNewsletterSchema>;
export type ScheduleNewsletterInput = z.infer<typeof scheduleNewsletterSchema>;
