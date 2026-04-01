-- Campos de pago del programa en leads
alter table leads
  add column if not exists pago_programa boolean default false,
  add column if not exists plan_pago text check (plan_pago in ('completo', '2_partes', '3_partes')),
  add column if not exists monto_programa numeric,
  add column if not exists fecha_pago timestamptz;
