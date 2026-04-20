-- Newsletter send history + open tracking

CREATE TABLE IF NOT EXISTS public.newsletter_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  source text NOT NULL CHECK (source IN ('manual', 'scheduled')),
  recipient_count integer NOT NULL CHECK (recipient_count >= 0),
  sent_count integer NOT NULL DEFAULT 0 CHECK (sent_count >= 0),
  opened_unique_count integer NOT NULL DEFAULT 0 CHECK (opened_unique_count >= 0),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.newsletter_campaign_recipients (
  campaign_id uuid NOT NULL REFERENCES public.newsletter_campaigns(id) ON DELETE CASCADE,
  subscriber_token text NOT NULL,
  opened_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_id, subscriber_token)
);

CREATE INDEX IF NOT EXISTS idx_newsletter_campaigns_sent_at
  ON public.newsletter_campaigns (sent_at DESC NULLS LAST, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_newsletter_recipients_opened
  ON public.newsletter_campaign_recipients (campaign_id, opened_at);

CREATE OR REPLACE FUNCTION public.increment_newsletter_open_count(p_campaign_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.newsletter_campaigns
  SET opened_unique_count = opened_unique_count + 1
  WHERE id = p_campaign_id;
$$;

ALTER TABLE public.newsletter_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_campaign_recipients ENABLE ROW LEVEL SECURITY;
