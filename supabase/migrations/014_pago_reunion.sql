-- Add meeting payment tracking ($32) and free-text closer name
alter table public.leads add column if not exists pago_reunion boolean not null default false;
alter table public.leads add column if not exists closer_nombre text;
