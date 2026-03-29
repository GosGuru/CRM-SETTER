-- ============================================
-- CRM Setter/Closer — Migración 006
-- Trackear cuándo se agendó la call (fecha de booking)
-- ============================================

-- 1. Nueva columna para trackear cuándo se bookeó la call
ALTER TABLE public.leads ADD COLUMN fecha_call_set_at timestamptz;

-- 2. Backfill: para leads existentes que ya tienen fecha_call, usar updated_at como aproximación
UPDATE public.leads SET fecha_call_set_at = updated_at WHERE fecha_call IS NOT NULL;

-- 3. Índice para queries de KPI por fecha de agendamiento
CREATE INDEX idx_leads_fecha_call_set_at ON public.leads(fecha_call_set_at);
