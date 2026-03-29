-- ============================================
-- CRM Setter/Closer — Migración 002
-- Simplificar leads: celular nullable + campo instagram
-- ============================================

-- 1. Hacer celular nullable (leads nuevos se crean solo con nombre)
alter table public.leads alter column celular drop not null;

-- 2. Agregar campo instagram
alter table public.leads add column instagram text;
