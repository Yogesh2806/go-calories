-- Targets now come from sex, protein in g per kg and fat %, not a fixed percentage split.
-- Additive and nullable, so the previous app version keeps working while this rolls out.
alter table public.profiles add column if not exists sex text;
alter table public.profiles drop constraint if exists profiles_sex_check;
alter table public.profiles add constraint profiles_sex_check check (sex is null or sex in ('male','female'));
alter table public.profiles add column if not exists protein_per_kg numeric;
alter table public.profiles add column if not exists fat_pct numeric;
