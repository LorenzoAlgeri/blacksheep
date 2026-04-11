import { z } from "zod";

export const contactSchema = z.object({
  name: z
    .string()
    .min(1, "Nome obbligatorio")
    .max(100, "Nome troppo lungo")
    .transform((s) => s.trim()),
  date: z
    .string()
    .min(1, "Data obbligatoria")
    .max(50, "Data troppo lunga")
    .transform((s) => s.trim()),
  guests: z.coerce.number().int().min(1, "Minimo 1 persona").max(20, "Massimo 20 persone"),
  message: z
    .string()
    .max(500, "Messaggio troppo lungo")
    .optional()
    .default("")
    .transform((s) => s.trim()),
  // Honeypot: bots fill this invisible field
  website: z.string().optional(),
});

export type ContactInput = z.infer<typeof contactSchema>;
