-- Ca$hville v4 — player photos. Safe to run twice.
-- Each player's own photo, stored as a small (160px) image the app shrinks
-- before saving.
alter table public.players add column if not exists photo text;
