-- ============================================
-- CRM Setter/Closer — Migración 003
-- Tabla de plantillas WhatsApp personalizables
-- ============================================

create table public.templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  nombre text not null,
  contenido text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger para updated_at
create trigger on_templates_updated
  before update on public.templates
  for each row
  execute function public.handle_updated_at();

-- Índices
create index idx_templates_user on public.templates(user_id);

-- RLS
alter table public.templates enable row level security;

create policy "Users can manage their own templates"
  on public.templates for all
  using (auth.uid() = user_id);
