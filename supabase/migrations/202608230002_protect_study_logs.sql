-- study_logs contributes to public rankings. Clients may read their own
-- history, but every write must go through the authenticated server endpoint.
drop policy if exists "Users manage own study logs" on public.study_logs;

create policy "Users can read own study logs"
on public.study_logs for select to authenticated
using ((select auth.uid()) = user_id);
