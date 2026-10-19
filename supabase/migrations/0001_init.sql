-- Go Calories — initial schema.
-- Run in the Supabase SQL editor (or via `supabase db push`).
-- Every table is protected by Row Level Security: a signed-in user can only
-- ever see and change their own rows.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  height_cm numeric not null default 0,
  weight_kg numeric not null default 0,
  age int not null default 0,
  goal text not null default 'maintain' check (goal in ('lose','maintain','gain')),
  target_weight_kg numeric not null default 0,
  activity text not null default 'light' check (activity in ('sedentary','light','moderate','active')),
  calorie_goal int not null default 2000,
  split_protein int not null default 40,
  split_carbs int not null default 30,
  split_fat int not null default 30,
  units text not null default 'metric' check (units in ('metric','imperial')),
  accent text not null default 'graphite',
  theme text not null default 'system' check (theme in ('light','dark','system')),
  ai_mode text not null default 'cloud' check (ai_mode in ('cloud','chrome','device')),
  onboarded boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.food_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  log_date date not null,
  logged_at timestamptz not null default now(),
  meal text not null check (meal in ('breakfast','lunch','snacks','drinks','dinner')),
  name text not null,
  serving text not null default '',
  calories numeric not null default 0,
  protein_g numeric not null default 0,
  carbs_g numeric not null default 0,
  fat_g numeric not null default 0,
  fiber_g numeric not null default 0,
  sugar_g numeric not null default 0,
  sodium_mg numeric not null default 0,
  source text not null default 'manual' check (source in ('manual','barcode','describe','preset')),
  created_at timestamptz not null default now()
);
create index if not exists food_entries_user_date_idx on public.food_entries (user_id, log_date);

create table if not exists public.presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  serving text not null default '',
  calories numeric not null default 0,
  protein_g numeric not null default 0,
  carbs_g numeric not null default 0,
  fat_g numeric not null default 0,
  fiber_g numeric not null default 0,
  sugar_g numeric not null default 0,
  sodium_mg numeric not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists presets_user_idx on public.presets (user_id);

alter table public.profiles enable row level security;
alter table public.food_entries enable row level security;
alter table public.presets enable row level security;

create policy "profiles: own row" on public.profiles
  for all to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "food_entries: own rows" on public.food_entries
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "presets: own rows" on public.presets
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
