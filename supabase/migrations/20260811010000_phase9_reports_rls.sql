-- reports had RLS enabled since Phase 0 with no policies (the usual
-- empty-shell pattern). A reporter can insert and read back their own
-- filed reports; the reported user gets no SELECT access at all --
-- that's exactly how prd.md's "anonymous to the reported user" is
-- enforced at the DB level, not just a UI convention. No UPDATE/DELETE
-- policy -- once filed, a report is immutable (reviewed by the team,
-- no self-edit/retraction flow in scope).
create policy "reporters can insert their own reports"
  on public.reports for insert
  with check (auth.uid() = reporter_id);

create policy "reporters can read their own filed reports"
  on public.reports for select
  using (auth.uid() = reporter_id);
