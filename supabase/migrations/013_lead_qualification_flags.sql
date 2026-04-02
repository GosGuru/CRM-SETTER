-- Flags de calificación del lead
alter table leads
  add column if not exists cliente_potencial boolean default false,
  add column if not exists califica_economicamente boolean default false;
