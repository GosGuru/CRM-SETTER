-- Add pinned column to leads
ALTER TABLE public.leads
  ADD COLUMN pinned boolean NOT NULL DEFAULT false;

-- Index for efficient pinned-first queries
CREATE INDEX idx_leads_pinned ON public.leads (pinned DESC, created_at DESC);
