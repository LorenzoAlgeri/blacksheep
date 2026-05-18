-- Push notification subscriptions for Web Push API.
-- Each row stores a PushSubscription's endpoint + encryption keys,
-- optionally linked to a newsletter subscriber.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid REFERENCES public.subscribers(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);

CREATE INDEX push_subscriptions_subscriber_idx
  ON public.push_subscriptions(subscriber_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Service-role only: no public RLS policies needed since all access
-- goes through the server-side API with SUPABASE_SERVICE_ROLE_KEY.
