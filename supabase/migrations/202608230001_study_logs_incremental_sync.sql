-- Supports per-user incremental history reconciliation. The client requests
-- rows at or after its latest known session timestamp, ordered by that value.
create index if not exists study_logs_user_timestamp_idx
on public.study_logs (user_id, session_timestamp asc);
