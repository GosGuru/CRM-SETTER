-- Add hora_programada column to followups table
alter table public.followups
  add column if not exists hora_programada time;
