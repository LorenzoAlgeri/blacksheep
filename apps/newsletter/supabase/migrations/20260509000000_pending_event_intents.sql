-- Stores the intent "subscriber X wants to register for event Y" while
-- the subscriber's email is still pending double-opt-in confirmation.
-- Processed by GET /api/confirm after status flips to 'confirmed'.

CREATE TABLE public.pending_event_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid NOT NULL REFERENCES public.subscribers(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.list_events(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subscriber_id, event_id)
);

ALTER TABLE public.pending_event_intents ENABLE ROW LEVEL SECURITY;

CREATE INDEX pending_event_intents_subscriber_idx
  ON public.pending_event_intents (subscriber_id);
