-- Rename "seguimiento" state to "agendó" throughout leads table.
-- 1. Drop the existing check constraint
-- 2. Add new constraint that includes "agendó"
-- 3. Migrate all existing "seguimiento" rows to "agendó"
-- 4. Backfill fecha_call_set_at for any agendó leads missing it (use updated_at as proxy)

alter table public.leads
  drop constraint if exists leads_estado_check;

-- Migrate data BEFORE adding the constraint so validation passes
update public.leads
  set estado = 'agendó'
  where estado = 'seguimiento';

alter table public.leads
  add constraint leads_estado_check
  check (estado in ('nuevo', 'agendó', 'cerrado', 'pagó'));

-- Backfill fecha_call_set_at for agendó leads that are missing it
update public.leads
  set fecha_call_set_at = updated_at
  where estado = 'agendó'
    and fecha_call_set_at is null;
