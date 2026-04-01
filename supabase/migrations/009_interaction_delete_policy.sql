-- Allow users to delete their own interactions (needed for "revert" feature)
create policy "Users can delete their own interactions"
  on public.interactions for delete
  using (auth.uid() = user_id);
