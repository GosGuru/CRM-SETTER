-- Nombre real y apellido del lead (para subir al CRM del equipo)
alter table leads
  add column if not exists nombre_real text,
  add column if not exists apellido text;
