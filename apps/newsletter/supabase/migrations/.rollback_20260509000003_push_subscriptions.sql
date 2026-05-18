-- Rollback: remove push_subscriptions table
DROP INDEX IF EXISTS push_subscriptions_subscriber_idx;
DROP TABLE IF EXISTS public.push_subscriptions;
