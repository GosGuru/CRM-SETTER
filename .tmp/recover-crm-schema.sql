-- Emergency recovery script for CRM schema drift
-- Goal: restore missing public tables (leads/interactions/templates/settings)
-- while preserving existing users/followups data.
-- Run in Supabase SQL Editor against the affected project.

begin;

create extension if not exists pgcrypto;
create extension if not exists pg_trgm with schema extensions;

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  edad int,
  trabajo text,
  email text,
  celular text,
  respuestas text,
  instagram text,
  objetivo text,
  decisor text,
  inversion_ok text,
  compromiso text,
  estado text not null default 'nuevo',
  closer_id uuid,
  setter_id uuid not null,
  fecha_call timestamptz,
  fecha_call_set_at timestamptz,
  pinned boolean not null default false,
  nombre_real text,
  apellido text,
  pago_programa boolean default false,
  plan_pago text,
  monto_programa numeric,
  fecha_pago timestamptz,
  pago_reunion boolean not null default false,
  closer_nombre text,
  cliente_potencial boolean default false,
  califica_economicamente boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.leads add column if not exists edad int;
alter table public.leads add column if not exists trabajo text;
alter table public.leads add column if not exists email text;
alter table public.leads add column if not exists celular text;
alter table public.leads add column if not exists respuestas text;
alter table public.leads add column if not exists instagram text;
alter table public.leads add column if not exists objetivo text;
alter table public.leads add column if not exists decisor text;
alter table public.leads add column if not exists inversion_ok text;
alter table public.leads add column if not exists compromiso text;
alter table public.leads add column if not exists estado text not null default 'nuevo';
alter table public.leads add column if not exists closer_id uuid;
alter table public.leads add column if not exists setter_id uuid;
alter table public.leads add column if not exists fecha_call timestamptz;
alter table public.leads add column if not exists fecha_call_set_at timestamptz;
alter table public.leads add column if not exists pinned boolean not null default false;
alter table public.leads add column if not exists nombre_real text;
alter table public.leads add column if not exists apellido text;
alter table public.leads add column if not exists pago_programa boolean default false;
alter table public.leads add column if not exists plan_pago text;
alter table public.leads add column if not exists monto_programa numeric;
alter table public.leads add column if not exists fecha_pago timestamptz;
alter table public.leads add column if not exists pago_reunion boolean not null default false;
alter table public.leads add column if not exists closer_nombre text;
alter table public.leads add column if not exists cliente_potencial boolean default false;
alter table public.leads add column if not exists califica_economicamente boolean default false;
alter table public.leads add column if not exists created_at timestamptz not null default now();
alter table public.leads add column if not exists updated_at timestamptz not null default now();

update public.leads
set estado = 'agendó'
where estado = 'seguimiento';

alter table public.leads
  drop constraint if exists leads_estado_check;

alter table public.leads
  add constraint leads_estado_check
  check (estado in ('nuevo', 'agendó', 'cerrado', 'pagó'));

alter table public.leads
  drop constraint if exists leads_plan_pago_check;

alter table public.leads
  add constraint leads_plan_pago_check
  check (plan_pago is null or plan_pago in ('completo', '2_partes', '3_partes'));

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'leads_closer_id_fkey'
      and conrelid = 'public.leads'::regclass
  ) then
    alter table public.leads
      add constraint leads_closer_id_fkey
      foreign key (closer_id) references public.users(id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'leads_setter_id_fkey'
      and conrelid = 'public.leads'::regclass
  ) then
    alter table public.leads
      add constraint leads_setter_id_fkey
      foreign key (setter_id) references public.users(id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'on_leads_updated'
      and tgrelid = 'public.leads'::regclass
  ) then
    create trigger on_leads_updated
      before update on public.leads
      for each row
      execute function public.handle_updated_at();
  end if;
end $$;

create table if not exists public.interactions (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null,
  user_id uuid not null,
  tipo text not null,
  contenido text not null default '',
  created_at timestamptz not null default now()
);

alter table public.interactions
  drop constraint if exists interactions_tipo_check;

alter table public.interactions
  add constraint interactions_tipo_check
  check (tipo in ('nota', 'llamada', 'whatsapp', 'cambio_estado', 'calendario_enviado', 'fup_realizado'));

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'interactions_lead_id_fkey'
      and conrelid = 'public.interactions'::regclass
  ) then
    alter table public.interactions
      add constraint interactions_lead_id_fkey
      foreign key (lead_id) references public.leads(id) on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'interactions_user_id_fkey'
      and conrelid = 'public.interactions'::regclass
  ) then
    alter table public.interactions
      add constraint interactions_user_id_fkey
      foreign key (user_id) references public.users(id);
  end if;
end $$;

create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  nombre text not null,
  contenido text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'templates_user_id_fkey'
      and conrelid = 'public.templates'::regclass
  ) then
    alter table public.templates
      add constraint templates_user_id_fkey
      foreign key (user_id) references public.users(id) on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'on_templates_updated'
      and tgrelid = 'public.templates'::regclass
  ) then
    create trigger on_templates_updated
      before update on public.templates
      for each row
      execute function public.handle_updated_at();
  end if;
end $$;

create table if not exists public.settings (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);

create table if not exists public.followups (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null,
  user_id uuid not null,
  fecha_programada date not null,
  completado boolean not null default false,
  completado_at timestamptz,
  created_at timestamptz not null default now(),
  hora_programada time
);

insert into public.settings (key, value)
values
  ('commission_rate', '0.08'),
  ('cash_per_agenda', '32'),
  ('program_price', '697')
on conflict (key) do nothing;

alter table public.followups
  add column if not exists hora_programada time;

-- Preserve existing followups by recreating placeholder leads for orphan lead_id values.
insert into public.leads (id, nombre, setter_id, estado, created_at, updated_at)
select distinct
  f.lead_id,
  'Lead recuperado ' || left(f.lead_id::text, 8),
  f.user_id,
  'agendó',
  now(),
  now()
from public.followups f
left join public.leads l on l.id = f.lead_id
where l.id is null
  and exists (
    select 1
    from public.users u
    where u.id = f.user_id
  );

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'followups_lead_id_fkey'
      and conrelid = 'public.followups'::regclass
  ) then
    alter table public.followups
      add constraint followups_lead_id_fkey
      foreign key (lead_id) references public.leads(id) on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'followups_user_id_fkey'
      and conrelid = 'public.followups'::regclass
  ) then
    alter table public.followups
      add constraint followups_user_id_fkey
      foreign key (user_id) references public.users(id);
  end if;
end $$;

create index if not exists idx_leads_estado on public.leads(estado);
create index if not exists idx_leads_setter on public.leads(setter_id);
create index if not exists idx_leads_closer on public.leads(closer_id);
create index if not exists idx_leads_fecha_call on public.leads(fecha_call);
create index if not exists idx_leads_fecha_call_set_at on public.leads(fecha_call_set_at);
create index if not exists idx_leads_pinned on public.leads (pinned desc, created_at desc);
create index if not exists idx_interactions_lead on public.interactions(lead_id);
create index if not exists idx_interactions_created on public.interactions(created_at);
create index if not exists idx_templates_user on public.templates(user_id);
create index if not exists idx_followups_fecha_completado on public.followups(fecha_programada, completado);
create index if not exists idx_followups_lead on public.followups(lead_id);

create index if not exists idx_leads_nombre_trgm
  on public.leads using gin (nombre gin_trgm_ops);

create index if not exists idx_leads_nombre_real_trgm
  on public.leads using gin (nombre_real gin_trgm_ops);

create index if not exists idx_leads_apellido_trgm
  on public.leads using gin (apellido gin_trgm_ops);

create index if not exists idx_leads_celular_trgm
  on public.leads using gin (celular gin_trgm_ops);

create index if not exists idx_leads_email_trgm
  on public.leads using gin (email gin_trgm_ops);

create index if not exists idx_leads_instagram_trgm
  on public.leads using gin (instagram gin_trgm_ops);

create index if not exists idx_leads_updated_at_desc
  on public.leads (updated_at desc);

alter table public.users enable row level security;
alter table public.leads enable row level security;
alter table public.interactions enable row level security;
alter table public.followups enable row level security;
alter table public.templates enable row level security;
alter table public.settings enable row level security;

drop policy if exists "Users can read all users" on public.users;
create policy "Users can read all users"
  on public.users for select
  using (true);

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

drop policy if exists "Setters can manage their leads" on public.leads;
create policy "Setters can manage their leads"
  on public.leads for all
  using (auth.uid() = setter_id);

drop policy if exists "Closers can view assigned leads" on public.leads;
create policy "Closers can view assigned leads"
  on public.leads for select
  using (auth.uid() = closer_id);

drop policy if exists "Closers can update assigned leads" on public.leads;
create policy "Closers can update assigned leads"
  on public.leads for update
  using (auth.uid() = closer_id);

drop policy if exists "Setters and service role can insert leads" on public.leads;
create policy "Setters and service role can insert leads"
  on public.leads
  for insert
  with check (
    auth.uid() = setter_id
    or auth.role() = 'service_role'
  );

drop policy if exists "Users can view interactions of their leads" on public.interactions;
create policy "Users can view interactions of their leads"
  on public.interactions for select
  using (
    exists (
      select 1
      from public.leads
      where leads.id = interactions.lead_id
        and (leads.setter_id = auth.uid() or leads.closer_id = auth.uid())
    )
  );

drop policy if exists "Users can create interactions on their leads" on public.interactions;
create policy "Users can create interactions on their leads"
  on public.interactions for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.leads
      where leads.id = lead_id
        and (leads.setter_id = auth.uid() or leads.closer_id = auth.uid())
    )
  );

drop policy if exists "Users can delete their own interactions" on public.interactions;
create policy "Users can delete their own interactions"
  on public.interactions for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can view followups of their leads" on public.followups;
create policy "Users can view followups of their leads"
  on public.followups for select
  using (
    exists (
      select 1
      from public.leads
      where leads.id = followups.lead_id
        and (leads.setter_id = auth.uid() or leads.closer_id = auth.uid())
    )
  );

drop policy if exists "Users can create followups for their leads" on public.followups;
create policy "Users can create followups for their leads"
  on public.followups for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.leads
      where leads.id = followups.lead_id
        and (leads.setter_id = auth.uid() or leads.closer_id = auth.uid())
    )
  );

drop policy if exists "Users can update followups of their leads" on public.followups;
create policy "Users can update followups of their leads"
  on public.followups for update
  using (
    exists (
      select 1
      from public.leads
      where leads.id = followups.lead_id
        and (leads.setter_id = auth.uid() or leads.closer_id = auth.uid())
    )
  );

drop policy if exists "Users can delete followups of their leads" on public.followups;
create policy "Users can delete followups of their leads"
  on public.followups for delete
  using (
    exists (
      select 1
      from public.leads
      where leads.id = followups.lead_id
        and (leads.setter_id = auth.uid() or leads.closer_id = auth.uid())
    )
  );

drop policy if exists "Users can manage their own templates" on public.templates;
create policy "Users can manage their own templates"
  on public.templates for all
  using (auth.uid() = user_id);

drop policy if exists "settings: read by authenticated" on public.settings;
create policy "settings: read by authenticated"
  on public.settings
  for select to authenticated
  using (true);

drop policy if exists "settings: write by authenticated" on public.settings;
create policy "settings: write by authenticated"
  on public.settings
  for all to authenticated
  using (true)
  with check (true);

commit;
