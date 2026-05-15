import { z } from "zod/v4";

export const GENDER_VALUES = ["male", "female"] as const;
export type Gender = (typeof GENDER_VALUES)[number];
export const genderSchema = z.enum(GENDER_VALUES);

export const subscribeSchema = z.object({
  email: z.email("Inserisci un'email valida"),
  gender: genderSchema,
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

// ============================================================
// BlackSheep List — Phase 4 endpoints (events / contact-help)
// ============================================================

/**
 * /api/events/register — public event registration form.
 * email + emailConfirmation must match case-insensitively (anti-typo).
 * website is a honeypot; truthy values are rejected at route level.
 */
export const eventRegisterSchema = z
  .object({
    eventId: z.uuid("ID evento non valido"),
    email: z.email("Inserisci un'email valida"),
    emailConfirmation: z.email("Inserisci un'email valida"),
    gender: genderSchema.optional(), // optional: provided for atomic gender-update+register flow
    website: z.string().optional(), // honeypot
  })
  .refine((d) => d.email.toLowerCase() === d.emailConfirmation.toLowerCase(), {
    message: "Le email non coincidono",
    path: ["emailConfirmation"],
  });

/**
 * /api/events/register-and-subscribe — combined newsletter subscription +
 * event registration for non-subscribers. Creates a pending subscriber and
 * queues an event intent processed after double-opt-in confirmation.
 */
export const registerAndSubscribeSchema = z.object({
  eventId: z.uuid("ID evento non valido"),
  email: z.email("Inserisci un'email valida"),
  name: z.string().max(200).optional(),
  gender: genderSchema,
  consentVersion: z.literal("v1.0"),
  website: z.string().optional(), // honeypot
});

export type RegisterAndSubscribeInput = z.infer<typeof registerAndSubscribeSchema>;

/**
 * /api/events/resend-confirmation — request a new confirmation email
 * for a subscriber stuck in 'pending' status.
 */
export const resendConfirmationSchema = z.object({
  email: z.email("Inserisci un'email valida"),
});

/**
 * /api/contact-help — "Scrivici" form for users in pending state who
 * cannot find their confirmation email. Persisted in contact_help_requests
 * and forwarded to founders via Resend.
 */
export const contactHelpSchema = z.object({
  email: z.email("Inserisci un'email valida"),
  phone: z.string().min(5, "Telefono troppo corto").max(30, "Telefono troppo lungo"),
  name: z.string().min(1, "Nome obbligatorio").max(100, "Nome troppo lungo"),
  message: z.string().max(2000, "Messaggio troppo lungo").optional(),
  website: z.string().optional(), // honeypot
});

/**
 * /api/admin/events — admin CRUD for events. event_date must be ISO 8601;
 * slug is lowercase + dash (URL-safe). status defaults to 'draft' so
 * admin creates aren't published until explicitly set to 'published'.
 */
export const adminEventBaseSchema = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug deve essere lowercase con trattini")
    .min(3, "Slug troppo corto")
    .max(80, "Slug troppo lungo"),
  title: z.string().min(1, "Titolo obbligatorio").max(200, "Titolo troppo lungo"),
  event_date: z.iso.datetime({
    offset: true,
    message: "Data evento non valida (richiesto formato ISO 8601)",
  }),
  venue: z.string().min(1, "Venue obbligatorio").max(200, "Venue troppo lungo"),
  description: z.string().max(5000, "Descrizione troppo lunga").optional().nullable(),
  capacity: z.number().int().positive().optional().nullable(),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  registration_deadline: z.iso
    .datetime({ offset: true, message: "Data chiusura non valida (richiesto formato ISO 8601)" })
    .optional()
    .nullable(),
});

export const adminEventSchema = adminEventBaseSchema.refine(
  (d) => {
    if (!d.registration_deadline) return true;
    return new Date(d.registration_deadline) < new Date(d.event_date);
  },
  {
    message: "La chiusura iscrizioni deve essere prima della data evento",
    path: ["registration_deadline"],
  },
);

export type SubscribeInput = z.infer<typeof subscribeSchema>;
export type SendNewsletterInput = z.infer<typeof sendNewsletterSchema>;
export type ScheduleNewsletterInput = z.infer<typeof scheduleNewsletterSchema>;
export type SubscriberActionInput = z.infer<typeof subscriberActionSchema>;
export type AdminFollowUpInput = z.infer<typeof adminFollowUpSchema>;
export type EventRegisterInput = z.infer<typeof eventRegisterSchema>;
export type ResendConfirmationInput = z.infer<typeof resendConfirmationSchema>;
export type ContactHelpInput = z.infer<typeof contactHelpSchema>;
export type AdminEventInput = z.infer<typeof adminEventSchema>;
