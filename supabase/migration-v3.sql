-- Ca$hville v3 — automatic losing-streak top-ups.
-- A row here adds `amount` to the stake of `week_number`'s bet. Rows are
-- created (and removed) by the app when a pick in `source_week` is marked
-- lost and it makes 2 or 3 losses in a row. Safe to run twice.

create table if not exists public.topups (
  id          uuid primary key default gen_random_uuid(),
  week_number int  not null,   -- the week whose bet gets the extra
  source_week int  not null,   -- the losing week that triggered it
  player_id   text not null,
  amount      numeric not null check (amount > 0),
  created_at  timestamptz not null default now(),
  unique (source_week, player_id)
);

alter table public.topups enable row level security;
drop policy if exists "dev-open-rls" on public.topups;
create policy "dev-open-rls" on public.topups for all using (true) with check (true);
grant all on public.topups to anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'topups'
  ) then
    alter publication supabase_realtime add table public.topups;
  end if;
end $$;
