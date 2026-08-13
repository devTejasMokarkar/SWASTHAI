-- ============================================================
-- SwasthAI Phase 3 Migration — Activity Logs & Meds
-- ============================================================

-- 1. Activity Logs table
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  action text not null,
  details jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
create index idx_activity_logs_user_id on public.activity_logs(user_id);
alter table public.activity_logs enable row level security;
create policy "Users manage own activity logs"
  on public.activity_logs for all
  using (auth.uid() = user_id);

-- 2. Extend Medications table
alter table public.medications add column if not exists strength varchar(50);
alter table public.medications add column if not exists duration_months integer;
