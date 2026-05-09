-- Optional deadline for event registrations. NULL means no deadline.

ALTER TABLE public.list_events
  ADD COLUMN registration_deadline timestamptz NULL;
