import { z } from "zod/v4";

export const subscribeSchema = z.object({
  email: z.email("Inserisci un'email valida"),
  name: z.string().max(100).optional(),
  website: z.string().optional(), // honeypot: any value allowed, checked in route
});

export const sendNewsletterSchema = z.object({
  subject: z.string().min(1, "Oggetto obbligatorio").max(200),
  body: z.string().min(1, "Contenuto obbligatorio").max(50000),
});

export type SubscribeInput = z.infer<typeof subscribeSchema>;
export type SendNewsletterInput = z.infer<typeof sendNewsletterSchema>;
