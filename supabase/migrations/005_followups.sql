-- ============================================
-- Follow-ups programados
-- ============================================

create table public.followups (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  user_id uuid not null references public.users(id),
  fecha_programada date not null,
  completado boolean not null default false,
  completado_at timestamptz,
  created_at timestamptz not null default now()
);

-- Índices
create index idx_followups_fecha_completado on public.followups(fecha_programada, completado);
create index idx_followups_lead on public.followups(lead_id);

-- RLS
alter table public.followups enable row level security;

create policy "Users can view followups of their leads"
  on public.followups for select
  using (
    exists (
      select 1 from public.leads
      where leads.id = followups.lead_id
      and (leads.setter_id = auth.uid() or leads.closer_id = auth.uid())
    )
  );

create policy "Users can create followups for their leads"
  on public.followups for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.leads
      where leads.id = followups.lead_id
      and (leads.setter_id = auth.uid() or leads.closer_id = auth.uid())
    )
  );

create policy "Users can update followups of their leads"
  on public.followups for update
  using (
    exists (
      select 1 from public.leads
      where leads.id = followups.lead_id
      and (leads.setter_id = auth.uid() or leads.closer_id = auth.uid())
    )
  );

create policy "Users can delete followups of their leads"
  on public.followups for delete
  using (
    exists (
      select 1 from public.leads
      where leads.id = followups.lead_id
      and (leads.setter_id = auth.uid() or leads.closer_id = auth.uid())
    )
  );
