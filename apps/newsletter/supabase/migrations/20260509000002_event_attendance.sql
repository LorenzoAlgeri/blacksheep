-- Tracks which registered subscribers actually showed up at the event.
-- Toggle: INSERT to mark present, DELETE to unmark.

CREATE TABLE public.event_attendance (
  event_id uuid NOT NULL REFERENCES public.list_events(id) ON DELETE RESTRICT,
  subscriber_id uuid NOT NULL REFERENCES public.subscribers(id) ON DELETE CASCADE,
  attended_at timestamptz NOT NULL DEFAULT now(),
  marked_by text,
  PRIMARY KEY (event_id, subscriber_id)
);

ALTER TABLE public.event_attendance ENABLE ROW LEVEL SECURITY;

CREATE INDEX event_attendance_event_idx
  ON public.event_attendance (event_id);
