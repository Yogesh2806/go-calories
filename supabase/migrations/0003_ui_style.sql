-- Visual style of the app: "glass" (Mono Glass, the original look) or "paper".
alter table public.profiles add column if not exists style text not null default 'glass';
alter table public.profiles drop constraint if exists profiles_style_check;
alter table public.profiles
  add constraint profiles_style_check check (style in ('glass','paper'));
