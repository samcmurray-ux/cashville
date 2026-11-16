-- Ca$hville v2 — fines, votes, side bets, bet-placer rotation.
-- Paste this whole file into Supabase → SQL Editor → Run. Safe to run twice.

-- Who places the bet with the bookie that week (null = follow the rotation).
alter table public.weeks add column if not exists placer_id text;
-- Anchor the rotation: Conor placed the most recent settled week, so the
-- app works out Heb for the week after, then JC, Jamie, Rob, Sam, JT...
update public.weeks set placer_id = 'conor'
where placer_id is null
  and not exists (select 1 from public.weeks where placer_id is not null)
  and week_number = (
    select max(week_number) from public.picks where result in ('Won', 'Lost', 'Push')
  );

-- One row of app-wide settings: fine amounts, side-bet tax, house rules.
create table if not exists public.app_settings (
  id               int primary key default 1 check (id = 1),
  late_fine        numeric not null default 10,
  loss_fine        numeric not null default 35,
  streak4_fine     numeric not null default 50,  -- 4 losses in a row
  topup_2          numeric not null default 15,  -- added to next bet after 2 in a row
  topup_3          numeric not null default 25,  -- ...after 3 in a row
  overdue_fine     numeric not null default 10,
  side_bet_tax_pct numeric not null default 20,
  rules_text       text    not null default
    E'All selections must be sent before 13:00 on Friday each week. Late pick = automatic forfeit & public shame.\n\n4 losses in a row = 1-month ban (still paying in if it''s your week).\n\nLeaving the WhatsApp group is an automatic €50 into the kitty.',
  -- Losing-leg fines are only auto-created from this week on, so re-settling
  -- an old week doesn't fine anyone twice.
  fines_from_week  int     not null default 0
);
insert into public.app_settings (id, fines_from_week)
select 1, coalesce((select max(week_number) from public.weeks), 0) + 1
on conflict (id) do nothing;

create table if not exists public.fines (
  id             uuid primary key default gen_random_uuid(),
  week_number    int,
  player_id      text not null,
  kind           text not null check (kind in ('late', 'loss', 'overdue', 'manual')),
  amount         numeric not null,
  reason         text not null default '',
  paid           boolean not null default false,
  paid_at        timestamptz,
  movement_id    text,          -- the Pot entry created when it was paid
  parent_fine_id uuid references public.fines (id) on delete cascade,
  created_at     timestamptz not null default now()
);
-- One late fine and one losing-leg fine per player per week; one overdue
-- surcharge per fine. Stops two phones creating the same fine at once.
create unique index if not exists fines_auto_once
  on public.fines (week_number, player_id, kind) where kind in ('late', 'loss');
create unique index if not exists fines_overdue_once
  on public.fines (parent_fine_id);

create table if not exists public.votes (
  id          uuid primary key default gen_random_uuid(),
  week_number int  not null,
  voter_id    text not null,
  target_id   text not null,
  kind        text not null check (kind in ('star', 'poo', 'win', 'lose')),
  created_at  timestamptz not null default now(),
  unique (week_number, voter_id, target_id, kind)
);

create table if not exists public.side_bets (
  id           uuid primary key default gen_random_uuid(),
  week_number  int  not null,
  creator_id   text not null,
  opponent_id  text not null,
  subject_id   text not null,   -- whose pick the bet is about
  creator_backs text not null check (creator_backs in ('win', 'lose')),
  amount       numeric not null check (amount > 0),
  status       text not null default 'open' check (status in ('open', 'accepted', 'declined')),
  paid         boolean not null default false,
  movement_id  text,            -- the Pot entry for the tax, once squared up
  created_at   timestamptz not null default now()
);

-- Same open access as the existing tables (the app has no login).
do $$
declare t text;
begin
  foreach t in array array['app_settings', 'fines', 'votes', 'side_bets'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "dev-open-rls" on public.%I', t);
    execute format('create policy "dev-open-rls" on public.%I for all using (true) with check (true)', t);
    execute format('grant all on public.%I to anon, authenticated', t);
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
