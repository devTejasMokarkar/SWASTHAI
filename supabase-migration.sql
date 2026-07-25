-- =========================================================
-- Swasth-AI — Supabase Postgres migration
-- Identity: auth.users.id (Supabase Auth, Google sign-in) is
-- the real key everywhere. Gmail is a display/billing field
-- only, never a join key. RLS enforces per-user access at
-- the database layer instead of app-level Bearer checks.
-- =========================================================

create extension if not exists "pgcrypto";
create extension if not exists "vector"; -- pgvector, for symptom/report embeddings

-- ---------------------------------------------------------
-- Profiles (onboarding data — auth.users only holds auth fields)
-- ---------------------------------------------------------
create table profiles (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  email             text, -- synced from auth.users.email, display/billing only
  name              varchar(120) not null,
  age               smallint,
  gender            varchar(20),
  weight_kg         numeric(5,2),
  conditions        text[] default '{}',
  medications_text  text,
  history_text      text,
  tier              varchar(20) not null default 'free', -- free | standard | premium
  billing_cycle_start date not null default current_date,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles_select_own" on profiles
  for select using (auth.uid() = user_id);
create policy "profiles_insert_own" on profiles
  for insert with check (auth.uid() = user_id);
create policy "profiles_update_own" on profiles
  for update using (auth.uid() = user_id);
create policy "profiles_delete_own" on profiles
  for delete using (auth.uid() = user_id);

-- Auto-create a profile row on first sign-in, pre-filled with
-- whatever the client passes in raw_user_meta_data (from the
-- onboarding form collected before sign-in).
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', 'New user')
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------
-- Family members (Premium — each member has their own auth.users row)
-- ---------------------------------------------------------
create table family_members (
  id                uuid primary key default gen_random_uuid(),
  primary_user_id   uuid not null references auth.users(id) on delete cascade,
  member_user_id    uuid not null references auth.users(id) on delete cascade,
  relationship      varchar(50),
  created_at        timestamptz not null default now(),
  unique (primary_user_id, member_user_id)
);

alter table family_members enable row level security;

create policy "family_select_related" on family_members
  for select using (auth.uid() = primary_user_id or auth.uid() = member_user_id);
create policy "family_insert_as_primary" on family_members
  for insert with check (auth.uid() = primary_user_id);
create policy "family_delete_as_primary" on family_members
  for delete using (auth.uid() = primary_user_id);

-- ---------------------------------------------------------
-- Medications & reminders
-- ---------------------------------------------------------
create table medications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          varchar(150) not null,
  dose          varchar(50),
  condition     varchar(50),
  time_of_day   time[] not null,
  with_food     boolean default false,
  active        boolean default true,
  created_at    timestamptz not null default now()
);

alter table medications enable row level security;
create policy "medications_owner_all" on medications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table medication_logs (
  id              uuid primary key default gen_random_uuid(),
  medication_id   uuid not null references medications(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  scheduled_time  timestamptz not null,
  status          varchar(20) not null, -- taken | missed | snoozed
  logged_at       timestamptz not null default now()
);

alter table medication_logs enable row level security;
create policy "medication_logs_owner_all" on medication_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------
-- Symptom analysis (with embedding for Tier 2 semantic retrieval)
-- ---------------------------------------------------------
create table symptom_logs (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid not null references auth.users(id) on delete cascade,
  input_text                  text not null,
  risk_score                  smallint,
  tier                        varchar(30), -- home_care | monitor | see_doctor_24h | emergency
  ai_reason                   text,
  is_emergency_shortcircuit   boolean default false,
  embedding                   vector(1024),
  created_at                  timestamptz not null default now()
);

alter table symptom_logs enable row level security;
create policy "symptom_logs_owner_all" on symptom_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index idx_symptom_logs_embedding on symptom_logs
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ---------------------------------------------------------
-- Readings (manual + Apple Health/HealthKit sourced)
-- ---------------------------------------------------------
create table readings (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  type          varchar(30) not null, -- bp | sugar | weight | steps | sleep | heart_rate | water | temperature | spo2
  value         varchar(50) not null,
  unit          varchar(20),
  context       varchar(30), -- e.g. fasting | post_meal, sugar-specific
  source        varchar(20) not null default 'manual', -- manual | healthkit
  recorded_at   timestamptz not null,
  created_at    timestamptz not null default now(),
  unique (user_id, type, source, recorded_at)
);

alter table readings enable row level security;
create policy "readings_owner_all" on readings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index idx_readings_user_type on readings(user_id, type, recorded_at desc);

-- ---------------------------------------------------------
-- Files: reports & prescriptions (with embedding for Tier 2 retrieval)
-- ---------------------------------------------------------
create table files (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  type          varchar(20) not null, -- report | prescription
  storage_url   text not null,
  title         varchar(200),
  ocr_summary   text,
  embedding     vector(1024),
  uploaded_at   timestamptz not null default now()
);

alter table files enable row level security;
create policy "files_owner_all" on files
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index idx_files_embedding on files
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ---------------------------------------------------------
-- AI credit metering
-- ---------------------------------------------------------
create table credit_usage (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  feature         varchar(50) not null, -- symptom_analysis | daily_recommendation | report_summary | chat
  tokens_used     integer,
  cost_estimate   numeric(10,4),
  created_at      timestamptz not null default now()
);

alter table credit_usage enable row level security;
create policy "credit_usage_owner_select" on credit_usage
  for select using (auth.uid() = user_id);
-- Inserts happen server-side only (service role), not directly by the client.

-- ---------------------------------------------------------
-- Subscriptions
-- ---------------------------------------------------------
create table subscriptions (
  user_id             uuid primary key references auth.users(id) on delete cascade,
  tier                varchar(20) not null,
  stripe_customer_id  varchar(100),
  current_period_end  timestamptz,
  updated_at          timestamptz not null default now()
);

alter table subscriptions enable row level security;
create policy "subscriptions_owner_select" on subscriptions
  for select using (auth.uid() = user_id);
-- Inserts/updates happen server-side only (Stripe webhook, service role).

-- ---------------------------------------------------------
-- Connected devices (Apple Health overlap detection)
-- ---------------------------------------------------------
create table connected_devices (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  device_identifier   varchar(200) not null,
  device_model        varchar(100),
  os_version          varchar(50),
  healthkit_connected boolean default true,
  last_synced_at      timestamptz,
  created_at          timestamptz not null default now(),
  revoked_at          timestamptz
);

alter table connected_devices enable row level security;
create policy "connected_devices_owner_all" on connected_devices
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index idx_devices_identifier on connected_devices(device_identifier) where revoked_at is null;

-- Overlap check (run server-side before completing a new HealthKit connection):
-- select user_id from connected_devices
-- where device_identifier = $1 and revoked_at is null and user_id != $2;

-- ---------------------------------------------------------
-- Agent call audit log (RAG retrieval-then-generate enforcement)
-- ---------------------------------------------------------
create table agent_calls (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  query               text,
  tools_called        text[],           -- e.g. {fetch_profile, search_history, suggest_diet}
  retrieved_context   jsonb,            -- snapshot of Tier 1 + Tier 2 data used
  raw_response        text,
  safety_warnings     text[],
  created_at          timestamptz not null default now()
);

alter table agent_calls enable row level security;
create policy "agent_calls_owner_select" on agent_calls
  for select using (auth.uid() = user_id);
-- Inserts happen server-side only (service role), never directly by the client.

-- ---------------------------------------------------------
-- Notes on server-side vs client-side access
-- ---------------------------------------------------------
-- Tables the client can read/write directly (RLS-protected):
--   profiles, family_members, medications, medication_logs,
--   symptom_logs, readings, files, connected_devices
--
-- Tables written only by your backend using the Supabase
-- service_role key (bypasses RLS by design — never expose
-- this key to the client):
--   credit_usage (insert), subscriptions (insert/update),
--   agent_calls (insert)
--
-- This matches the "retrieval-then-generate" contract from the
-- RAG pivot PRD: your backend's /api/ai/* route calls fetch_profile
-- and search_history itself (using service_role or the user's own
-- session token, either works since RLS allows owner-read), before
-- ever constructing the generation prompt.