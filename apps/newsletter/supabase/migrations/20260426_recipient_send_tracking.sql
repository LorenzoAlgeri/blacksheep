-- Per-recipient send tracking for newsletter campaigns
--
-- Context: the existing send pipeline fires up to 50 emails in parallel via
-- Promise.allSettled and only writes a single aggregate sent_count at the end
-- of the loop. When the function dies mid-flight (Vercel timeout, Resend rate
-- limit, etc.) the campaign is stuck in an inconsistent state and we have no
-- way to identify which recipients actually received the email.
--
-- This migration:
--   1. Adds per-recipient persistence columns so the new send pipeline can
--      mark each recipient as sent/failed atomically and resume safely.
--   2. Backfills the 15 recipients that received the "Ci sei dentro." campaign
--      on 2026-04-25 (campaign 57e1dd73-9847-4545-9ea0-5afa08cde42c) so the
--      first call to the new resume endpoint skips them and only delivers
--      to the ~94 still pending.
--
-- Idempotent: every operation is guarded so re-running is safe.

-- ============================================================
-- 1. Tracking columns
-- ============================================================

ALTER TABLE public.newsletter_campaign_recipients
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS failed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0;

-- The campaign HTML is now persisted on the campaign row so the resume
-- endpoint and the daily cron drain can re-render the same body without the
-- admin having to re-paste it. Older campaigns (e.g. "Ci sei dentro.") have
-- html = NULL and must receive a one-time html payload on the first resume
-- call, after which it is stored here.
ALTER TABLE public.newsletter_campaigns
  ADD COLUMN IF NOT EXISTS html text;

-- Partial index: hot path is "give me the next chunk of pending recipients
-- for this campaign". Excluding sent rows keeps the index tiny once a
-- campaign is fully delivered.
CREATE INDEX IF NOT EXISTS idx_recipients_campaign_pending
  ON public.newsletter_campaign_recipients (campaign_id)
  WHERE sent_at IS NULL;

-- Used by the cron sweeper to find campaigns that still have undelivered
-- recipients (for the safety-net daily drain).
CREATE INDEX IF NOT EXISTS idx_recipients_pending_global
  ON public.newsletter_campaign_recipients (campaign_id, attempts)
  WHERE sent_at IS NULL;

-- ============================================================
-- 2. Backfill "Ci sei dentro." (2026-04-25 13:00:22+00)
-- ============================================================
--
-- These 15 addresses are confirmed delivered in the Resend export
-- (subjects matching "Ci sei dentro.", events 'delivered'). Marking them
-- sent_at prevents duplicate delivery when the campaign is resumed.

DO $$
DECLARE
  target_campaign uuid := '57e1dd73-9847-4545-9ea0-5afa08cde42c';
  delivered_emails text[] := ARRAY[
    'diengamadou29p@gmail.com',
    'chiapiluca@gmail.com',
    'fallouwadji28@gmail.com',
    'hermelaghidei@gmail.com',
    'ivanadossantos85@gmail.com',
    'aurorabusico6@gmail.com',
    'giorgia.turconi@gmail.com',
    'modouleye955@gmail.com',
    'simone01.scarfone@gmail.com',
    'rossamuele98@gmail.com',
    'jalen.simpson@okstate.edu',
    'giovanniprofeta94@gmail.com',
    'nwaofomspindrell@gmail.com',
    'salattisisay5@gmail.com',
    'younmomo96@gmail.com'
  ];
BEGIN
  -- Skip if the campaign no longer exists (e.g. on a fresh dev DB).
  IF NOT EXISTS (SELECT 1 FROM public.newsletter_campaigns WHERE id = target_campaign) THEN
    RAISE NOTICE 'Backfill skipped: campaign % not found', target_campaign;
    RETURN;
  END IF;

  UPDATE public.newsletter_campaign_recipients r
     SET sent_at = '2026-04-25 13:00:22+00'::timestamptz,
         attempts = GREATEST(r.attempts, 1)
    FROM public.subscribers s
   WHERE r.campaign_id = target_campaign
     AND r.subscriber_token = s.token
     AND r.sent_at IS NULL
     AND lower(s.email) = ANY (SELECT lower(unnest(delivered_emails)));

  RAISE NOTICE 'Backfill complete for campaign %', target_campaign;
END $$;

-- Realign sent_count on the campaign so the admin UI shows the right number
-- before the resume endpoint runs.
UPDATE public.newsletter_campaigns c
   SET sent_count = sub.delivered
  FROM (
    SELECT campaign_id, COUNT(*)::integer AS delivered
      FROM public.newsletter_campaign_recipients
     WHERE sent_at IS NOT NULL
     GROUP BY campaign_id
  ) sub
 WHERE c.id = sub.campaign_id;
