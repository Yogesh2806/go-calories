-- Allow the Chrome built-in AI (Gemini Nano) as an AI Food Parsing mode.
alter table public.profiles drop constraint if exists profiles_ai_mode_check;
alter table public.profiles
  add constraint profiles_ai_mode_check check (ai_mode in ('cloud','chrome','device'));
