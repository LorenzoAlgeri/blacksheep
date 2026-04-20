import { z } from "zod/v4";

export const subscribeSchema = z.object({
  email: z.email("Inserisci un'email valida"),
  name: z.string().max(100).optional(),
  website: z.string().optional(), // honeypot: any value allowed, checked in route
});

export const sendNewsletterSchema = z
  .object({
    subject: z.string().min(1, "Oggetto obbligatorio").max(200),
    html: z.string().min(1, "Contenuto obbligatorio").max(200000),
    deliveryMode: z.enum(["all", "single"]).default("all"),
    targetEmail: z.email("Email destinatario non valida").optional(),
  })
  .superRefine((data, ctx) => {
    if (data.deliveryMode === "single" && !data.targetEmail) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Email destinatario obbligatoria in modalita invio singolo",
        path: ["targetEmail"],
      });
    }
  });

export const scheduleNewsletterSchema = z.object({
  subject: z.string().min(1, "Oggetto obbligatorio").max(200),
  html: z.string().min(1, "Contenuto obbligatorio").max(200000),
  scheduledAt: z
    .string()
    .min(1, "Data obbligatoria")
    .refine((val) => !isNaN(Date.parse(val)), { message: "Data non valida. Usa formato ISO." }),
});

export const subscriberActionSchema = z.object({
  action: z.enum(["block", "unblock"]),
});

export const adminFollowUpSchema = z.object({
  mode: z.enum(["all", "selected", "oldest"]),
  subscriberIds: z.array(z.uuid()).optional(),
  oldestCount: z.number().int().positive().max(50).optional(),
});

export type SubscribeInput = z.infer<typeof subscribeSchema>;
export type SendNewsletterInput = z.infer<typeof sendNewsletterSchema>;
export type ScheduleNewsletterInput = z.infer<typeof scheduleNewsletterSchema>;
export type SubscriberActionInput = z.infer<typeof subscriberActionSchema>;
export type AdminFollowUpInput = z.infer<typeof adminFollowUpSchema>;
