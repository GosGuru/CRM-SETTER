-- Speed up global lead search with leading-wildcard ILIKE filters.
create extension if not exists pg_trgm with schema extensions;

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