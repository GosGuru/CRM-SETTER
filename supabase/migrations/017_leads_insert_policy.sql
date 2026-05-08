-- Explicit INSERT policy for leads.
-- Prevents false negatives when auth.uid() is unavailable (e.g., service-role flows).
drop policy if exists "Setters and service role can insert leads" on public.leads;

create policy "Setters and service role can insert leads"
  on public.leads
  for insert
  with check (
    auth.uid() = setter_id
    or auth.role() = 'service_role'
  );
