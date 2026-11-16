-- Ca$hville v6 — each player's celebration clip (short video or GIF).
-- Safe to run twice.
alter table public.players add column if not exists clip text;

-- A public storage folder for the clips, capped at 12 MB each.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('clips', 'clips', true, 12582912, array['video/mp4', 'video/quicktime', 'video/webm', 'image/gif'])
on conflict (id) do nothing;

-- Same open access as the rest of the app (there is no login), limited to
-- this folder.
drop policy if exists "clips open read" on storage.objects;
drop policy if exists "clips open insert" on storage.objects;
drop policy if exists "clips open update" on storage.objects;
drop policy if exists "clips open delete" on storage.objects;
create policy "clips open read"   on storage.objects for select using (bucket_id = 'clips');
create policy "clips open insert" on storage.objects for insert with check (bucket_id = 'clips');
create policy "clips open update" on storage.objects for update using (bucket_id = 'clips') with check (bucket_id = 'clips');
create policy "clips open delete" on storage.objects for delete using (bucket_id = 'clips');
