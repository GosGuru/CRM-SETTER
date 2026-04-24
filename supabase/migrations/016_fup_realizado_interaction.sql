-- Registrar FUPs realizados manualmente como interacción propia.
ALTER TABLE public.interactions
  DROP CONSTRAINT IF EXISTS interactions_tipo_check;

ALTER TABLE public.interactions
  ADD CONSTRAINT interactions_tipo_check
  CHECK (tipo IN ('nota', 'llamada', 'whatsapp', 'cambio_estado', 'calendario_enviado', 'fup_realizado'));