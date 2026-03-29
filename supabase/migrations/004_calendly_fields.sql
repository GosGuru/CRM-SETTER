-- ============================================
-- CRM Setter/Closer — Migración 004
-- Campos adicionales del formulario Calendly
-- ============================================

alter table public.leads add column objetivo text;
alter table public.leads add column decisor text;
alter table public.leads add column inversion_ok text;
alter table public.leads add column compromiso text;
