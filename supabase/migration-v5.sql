-- Ca$hville v5 — push notifications. Safe to run twice.
-- Sending is done by the "push" Edge Function (supabase/functions/push),
-- which creates its own signing keys in push_config on first use.
create extension if not exists pg_net;
create extension if not exists pg_cron;

-- One row per phone/browser that has notifications switched on.
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  player_id  text not null,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
drop policy if exists "dev-open-rls" on public.push_subscriptions;
create policy "dev-open-rls" on public.push_subscriptions for all using (true) with check (true);
grant all on public.push_subscriptions to anon, authenticated;

-- The signing keys. Private: row level security is on with no policies, so
-- only the Edge Function (service role) can read it.
create table if not exists public.push_config (
  id          int primary key default 1 check (id = 1),
  public_key  text not null,
  private_key text not null,
  created_at  timestamptz not null default now()
);
alter table public.push_config enable row level security;
revoke all on public.push_config from anon, authenticated;

alter table public.app_settings add column if not exists vapid_public_key text;

-- Friday pick reminders (times are UTC: 11:00 and 16:00, i.e. late morning
-- and an hour or two before the 6pm Irish deadline). Replace <PROJECT_REF>
-- and <ANON_KEY> with the project's values before running by hand.
--   select cron.schedule('cashville-pick-reminder-am', '0 11 * * 5', $$ select net.http_post(
--     url := 'https://<PROJECT_REF>.supabase.co/functions/v1/push',
--     headers := '{"Content-Type":"application/json","Authorization":"Bearer <ANON_KEY>"}'::jsonb,
--     body := '{"type":"reminder"}'::jsonb) $$);
--   select cron.schedule('cashville-pick-reminder-pm', '0 16 * * 5', $$ ...same... $$);
