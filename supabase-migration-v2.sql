-- ============================================================
-- SwasthAI Phase 2 Migration — New Tables
-- Run this in Supabase SQL Editor AFTER rotating secrets
-- ============================================================

-- 1. Vitals reminders
create table if not exists public.vitals_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  name text not null,
  type text not null,
  time text,
  frequency text default 'daily',
  repeat_days jsonb default '[]'::jsonb,
  completed boolean default false,
  created_at timestamptz default now()
);
alter table public.vitals_reminders enable row level security;
create policy "Users manage own vitals reminders"
  on public.vitals_reminders for all
  using (auth.uid() = user_id);

-- 2. Daily actions (water, vitamin D, breathing)
create table if not exists public.daily_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  date date not null default current_date,
  water_logged_ml integer default 0,
  vitamin_d_taken boolean default false,
  breathing_done boolean default false,
  unique(user_id, date)
);
alter table public.daily_actions enable row level security;
create policy "Users manage own daily actions"
  on public.daily_actions for all
  using (auth.uid() = user_id);

-- 3. Chat messages
create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  role text not null check (role in ('user', 'ai')),
  content text not null,
  session_id uuid,
  created_at timestamptz default now()
);
create index idx_chats_user_id on public.chats(user_id);
alter table public.chats enable row level security;
create policy "Users manage own chats"
  on public.chats for all
  using (auth.uid() = user_id);

-- 4. Drug interaction scans
create table if not exists public.scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  identified_name text,
  interaction_check text,
  conflict boolean default false,
  created_at timestamptz default now()
);
alter table public.scans enable row level security;
create policy "Users manage own scans"
  on public.scans for all
  using (auth.uid() = user_id);

-- 5. Sessions audit
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  ip_address text,
  user_agent text,
  device_info jsonb default '{}'::jsonb,
  login_method text default 'google',
  logged_in_at timestamptz default now(),
  last_active_at timestamptz default now(),
  is_active boolean default true
);
create index idx_sessions_user_id on public.sessions(user_id);
alter table public.sessions enable row level security;
create policy "Users view own sessions"
  on public.sessions for select
  using (auth.uid() = user_id);
