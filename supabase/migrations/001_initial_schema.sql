-- ============================================
-- CRM Setter/Closer — Schema inicial
-- ============================================

-- 1. Tabla de usuarios (se llena vía trigger al registrarse)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role text not null default 'setter' check (role in ('setter', 'closer')),
  avatar_url text,
  created_at timestamptz not null default now()
);

-- 2. Tabla de leads
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  edad int,
  trabajo text,
  email text,
  celular text not null,
  respuestas text,
  estado text not null default 'nuevo' check (estado in ('nuevo', 'seguimiento', 'cerrado', 'pagó')),
  closer_id uuid references public.users(id),
  setter_id uuid not null references public.users(id),
  fecha_call timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Tabla de interacciones
create table public.interactions (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  user_id uuid not null references public.users(id),
  tipo text not null check (tipo in ('nota', 'llamada', 'whatsapp', 'cambio_estado')),
  contenido text not null default '',
  created_at timestamptz not null default now()
);

-- 4. Trigger para updated_at automático en leads
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_leads_updated
  before update on public.leads
  for each row
  execute function public.handle_updated_at();

-- 5. Trigger para crear fila en users al registrarse vía auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture', null)
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- 6. Índices
create index idx_leads_estado on public.leads(estado);
create index idx_leads_setter on public.leads(setter_id);
create index idx_leads_closer on public.leads(closer_id);
create index idx_leads_fecha_call on public.leads(fecha_call);
create index idx_interactions_lead on public.interactions(lead_id);
create index idx_interactions_created on public.interactions(created_at);

-- 7. Row Level Security (RLS)
alter table public.users enable row level security;
alter table public.leads enable row level security;
alter table public.interactions enable row level security;

-- Users: cada usuario puede leer todos los usuarios (para asignar closers)
create policy "Users can read all users"
  on public.users for select
  using (true);

-- Users: solo pueden editar su propio perfil
create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

-- Leads: los setters ven/crean/editan sus propios leads
create policy "Setters can manage their leads"
  on public.leads for all
  using (auth.uid() = setter_id);

-- Leads: los closers pueden ver y actualizar leads asignados a ellos
create policy "Closers can view assigned leads"
  on public.leads for select
  using (auth.uid() = closer_id);

create policy "Closers can update assigned leads"
  on public.leads for update
  using (auth.uid() = closer_id);

-- Interactions: usuarios pueden ver interacciones de leads que les pertenecen
create policy "Users can view interactions of their leads"
  on public.interactions for select
  using (
    exists (
      select 1 from public.leads
      where leads.id = interactions.lead_id
      and (leads.setter_id = auth.uid() or leads.closer_id = auth.uid())
    )
  );

-- Interactions: usuarios pueden crear interacciones en sus leads
create policy "Users can create interactions on their leads"
  on public.interactions for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.leads
      where leads.id = lead_id
      and (leads.setter_id = auth.uid() or leads.closer_id = auth.uid())
    )
  );

-- 8. Habilitar Realtime para leads e interactions
alter publication supabase_realtime add table public.leads;
alter publication supabase_realtime add table public.interactions;
