"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { adminEventSchema } from "@/lib/validations";
import { basePath } from "@/lib/base-path";
import { BrandedDateTimePicker } from "./BrandedDateTimePicker";

// Local form type matching zodResolver output (status required after .default("draft"))
type EventFormValues = {
  title: string;
  slug: string;
  event_date: string;
  venue: string;
  description?: string | null;
  capacity?: number | null;
  registration_deadline?: string | null;
  status: "draft" | "published" | "archived";
};

interface EventFormProps {
  mode: "create" | "edit";
  defaultValues?: Partial<EventFormValues> & { id?: string };
  eventId?: string;
}

function isoToDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const inputClass =
  "w-full bg-transparent border border-bs-cream/20 rounded-md px-3 py-2 font-body text-sm text-bs-cream placeholder:text-bs-cream/30 focus:outline-none focus:border-bs-cream/40";
const labelClass = "block font-body text-xs tracking-wider text-bs-cream/50 mb-1";
const errorClass = "font-body text-xs text-bs-burgundy mt-1";

const STATUS_OPTIONS = [
  { value: "draft" as const, label: "BOZZA" },
  { value: "published" as const, label: "PUBBLICATO" },
  { value: "archived" as const, label: "ARCHIVIATO" },
];

export function EventForm({ mode, defaultValues, eventId }: EventFormProps) {
  const router = useRouter();
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<EventFormValues>({
    // Cast needed: zodResolver infers Zod input type (status optional via .default) but form type has status required
    resolver: zodResolver(adminEventSchema) as unknown as Resolver<EventFormValues>,
    mode: "onBlur",
    defaultValues: {
      status: "draft",
      ...defaultValues,
    },
  });

  const titleValue = watch("title");
  const statusValue = watch("status");
  // Track whether the user has manually edited the slug; once they do, stop
  // auto-deriving it from the title so we don't clobber their input.
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(
    mode === "edit" && Boolean(defaultValues?.slug),
  );

  useEffect(() => {
    if (!titleValue) return;
    if (slugManuallyEdited) return;
    const generated = titleValue
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    setValue("slug", generated, { shouldValidate: false });
  }, [titleValue, slugManuallyEdited, setValue]);

  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => setBanner(null), 3000);
    return () => clearTimeout(timer);
  }, [banner]);

  const onSubmit = async (data: EventFormValues) => {
    setSubmitting(true);
    setBanner(null);

    const payload = {
      ...data,
      event_date: new Date(data.event_date).toISOString(),
      capacity: data.capacity ?? null,
      description: data.description ?? null,
      registration_deadline: data.registration_deadline
        ? new Date(data.registration_deadline).toISOString()
        : null,
    };

    try {
      const url =
        mode === "create"
          ? `${basePath}/api/admin/events`
          : `${basePath}/api/admin/events/${eventId}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setBanner({
          type: "success",
          message: mode === "create" ? "Evento creato." : "Modifiche salvate.",
        });
        setTimeout(() => {
          router.push("/admin/events");
        }, 800);
        return;
      }

      if (res.status === 409) {
        setBanner({ type: "error", message: "Slug già utilizzato. Scegline un altro." });
      } else {
        const body = await res.json().catch(() => null);
        const detail = body?.error ?? `HTTP ${res.status}`;
        setBanner({ type: "error", message: `Errore: ${detail}` });
      }
    } catch {
      setBanner({ type: "error", message: "Errore durante il salvataggio. Riprova." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      {banner && (
        <div
          className={`px-4 py-3 rounded font-body text-xs ${
            banner.type === "success"
              ? "bg-bs-green/10 text-bs-green border border-bs-green/20"
              : "bg-bs-burgundy/10 text-bs-burgundy border border-bs-burgundy/20"
          }`}
        >
          {banner.message}
        </div>
      )}

      <div>
        <label htmlFor="event-title" className={labelClass}>
          TITOLO
        </label>
        <input
          id="event-title"
          type="text"
          placeholder="Nome evento"
          className={inputClass}
          {...register("title")}
        />
        {errors.title && <p className={errorClass}>{errors.title.message}</p>}
      </div>

      <div>
        <label htmlFor="event-slug" className={labelClass}>
          SLUG
        </label>
        <input
          id="event-slug"
          type="text"
          placeholder="nome-evento-slug"
          className={inputClass}
          {...register("slug", {
            onChange: () => setSlugManuallyEdited(true),
          })}
        />
        {errors.slug && <p className={errorClass}>{errors.slug.message}</p>}
      </div>

      <div>
        <label htmlFor="event-date" className={labelClass}>
          DATA E ORA
        </label>
        <Controller
          control={control}
          name="event_date"
          render={({ field, fieldState }) => (
            <BrandedDateTimePicker
              id="event-date"
              value={field.value ? isoToDatetimeLocal(field.value) : ""}
              onChange={(v) => field.onChange(v ? new Date(v).toISOString() : "")}
              invalid={fieldState.invalid}
              aria-describedby={fieldState.error ? "event-date-error" : undefined}
            />
          )}
        />
        {errors.event_date && (
          <p id="event-date-error" className={errorClass}>
            {errors.event_date.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="event-venue" className={labelClass}>
          VENUE
        </label>
        <input
          id="event-venue"
          type="text"
          placeholder="Nome venue / indirizzo"
          className={inputClass}
          {...register("venue")}
        />
        {errors.venue && <p className={errorClass}>{errors.venue.message}</p>}
      </div>

      <div>
        <label htmlFor="event-capacity" className={labelClass}>
          CAPIENZA <span className="text-bs-cream/30 normal-case tracking-normal">(opzionale)</span>
        </label>
        <input
          id="event-capacity"
          type="number"
          min="1"
          placeholder="Lascia vuoto per nessun limite"
          className={inputClass}
          {...register("capacity", {
            setValueAs: (v: string) => (v === "" ? undefined : parseInt(v, 10)),
          })}
        />
        {errors.capacity && <p className={errorClass}>{errors.capacity.message}</p>}
      </div>

      <div>
        <label htmlFor="event-deadline" className={labelClass}>
          CHIUSURA ISCRIZIONI{" "}
          <span className="text-bs-cream/30 normal-case tracking-normal">
            (opzionale — ora italiana)
          </span>
        </label>
        <Controller
          control={control}
          name="registration_deadline"
          render={({ field, fieldState }) => (
            <BrandedDateTimePicker
              id="event-deadline"
              value={field.value ? isoToDatetimeLocal(field.value) : ""}
              onChange={(v) => field.onChange(v ? new Date(v).toISOString() : null)}
              invalid={fieldState.invalid}
              aria-describedby={fieldState.error ? "event-deadline-error" : undefined}
            />
          )}
        />
        {errors.registration_deadline && (
          <p id="event-deadline-error" className={errorClass}>
            {errors.registration_deadline.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="event-description" className={labelClass}>
          DESCRIZIONE
        </label>
        <textarea
          id="event-description"
          rows={4}
          placeholder="Descrizione opzionale..."
          className={inputClass}
          {...register("description")}
        />
        {errors.description && <p className={errorClass}>{errors.description.message}</p>}
      </div>

      <div>
        <p className={labelClass}>STATUS</p>
        <div className="flex gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setValue("status", opt.value, { shouldValidate: true })}
              className={`font-body text-xs tracking-wider px-4 py-2 rounded border transition-colors cursor-pointer ${
                statusValue === opt.value
                  ? "border-bs-cream text-bs-cream bg-bs-cream/5"
                  : "border-bs-cream/10 text-bs-cream/50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {errors.status && <p className={errorClass}>{errors.status.message}</p>}
      </div>

      <div className="flex items-center gap-4 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="font-[family-name:var(--font-brand)] text-sm tracking-wider bg-bs-cream/10 text-bs-cream px-6 py-3 rounded hover:bg-bs-cream/20 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {mode === "create" ? "CREA EVENTO" : "SALVA MODIFICHE"}
        </button>
        {mode === "edit" && eventId && (
          <Link
            href={`/admin/events/${eventId}/preview`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-body text-xs text-bs-cream/40 hover:text-bs-cream transition-colors"
          >
            ANTEPRIMA ↗
          </Link>
        )}
        <Link
          href="/admin/events"
          className="font-body text-xs text-bs-cream/40 hover:text-bs-cream transition-colors"
        >
          ANNULLA
        </Link>
      </div>
    </form>
  );
}
