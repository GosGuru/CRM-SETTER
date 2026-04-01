-- Settings table para configuración de comisiones y precios
create table if not exists settings (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);

alter table settings enable row level security;

create policy "settings: read by authenticated" on settings
  for select to authenticated using (true);

create policy "settings: write by authenticated" on settings
  for all to authenticated using (true) with check (true);

-- Valores por defecto
insert into settings (key, value) values
  ('commission_rate', '0.08'),
  ('cash_per_agenda', '32'),
  ('program_price', '697')
on conflict (key) do nothing;
