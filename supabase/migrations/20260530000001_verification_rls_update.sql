-- Allow authenticated users to update their own verification row.
-- Required for upsert operations (INSERT ... ON CONFLICT DO UPDATE) in
-- verify.tsx and id-verify.tsx which both call supabase.from('verification').upsert().
create policy "Users can update own verification"
  on public.verification
  for update
  using (auth.uid() = user_id);
