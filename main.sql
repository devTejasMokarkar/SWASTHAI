-- ============================================================
-- SwasthAI - Master Database Schema
-- Consolidated from all migration files
-- ============================================================

-- ENABLING EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- Note: vector extension requires Supabase Pro or specific setup
-- CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================
-- 1. PROFILES (onboarding data - CRITICAL!)
-- ============================================================
-- This is where onboarding form data is saved after signup
-- app code saves here via: supabase.from('profiles').upsert()

CREATE TABLE IF NOT EXISTS public.profiles (
  user_id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email             text,
  name              varchar(120) NOT NULL,
  age               smallint,
  gender            varchar(20),
  weight_kg         numeric(5,2),
  height_cm         numeric(5,1),
  conditions        text[] DEFAULT '{}',
  medications_text  text,
  history_text      text,
  tier              varchar(20) NOT NULL DEFAULT 'free',
  billing_cycle_start date NOT NULL DEFAULT current_date,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "profiles_delete_own" ON profiles
  FOR DELETE USING (auth.uid() = user_id);

-- Auto-create profile trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', 'New user')
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. FAMILY MEMBERS (Premium feature)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.family_members (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship      varchar(50),
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (primary_user_id, member_user_id)
);

ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "family_select_related" ON family_members
  FOR SELECT USING (auth.uid() = primary_user_id OR auth.uid() = member_user_id);
CREATE POLICY "family_insert_as_primary" ON family_members
  FOR INSERT WITH CHECK (auth.uid() = primary_user_id);
CREATE POLICY "family_delete_as_primary" ON family_members
  FOR DELETE USING (auth.uid() = primary_user_id);

-- ============================================================
-- 3. MEDICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.medications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          varchar(150) NOT NULL,
  dose          varchar(50),
  condition     varchar(50),
  time_of_day   time[] NOT NULL DEFAULT '{}',
  with_food     boolean DEFAULT false,
  active        boolean DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  strength      varchar(50),
  duration_months integer
);

ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "medications_owner_all" ON medications
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 4. MEDICATION LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.medication_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id   uuid NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_time  timestamptz NOT NULL,
  status          varchar(20) NOT NULL,
  logged_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.medication_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "medication_logs_owner_all" ON medication_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 5. SYMPTOM LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.symptom_logs (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  input_text                  text NOT NULL,
  risk_score                  smallint,
  tier                        varchar(30),
  ai_reason                   text,
  is_emergency                boolean DEFAULT false,
  advice                      text[] DEFAULT '{}',
  created_at                  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.symptom_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "symptom_logs_owner_all" ON symptom_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 6. READINGS (vitals: bp, sugar, weight, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.readings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type          varchar(30) NOT NULL,
  value         varchar(50) NOT NULL,
  unit          varchar(20),
  context       varchar(30),
  source        varchar(20) NOT NULL DEFAULT 'manual',
  recorded_at   timestamptz NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  systolic      numeric,
  diastolic     numeric,
  UNIQUE(user_id, type, source, recorded_at)
);

ALTER TABLE public.readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "readings_owner_all" ON readings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_readings_user_type ON readings(user_id, type, recorded_at DESC);

-- ============================================================
-- 7. FILES / HEALTH FILES (reports & prescriptions)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.files (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type          varchar(20) NOT NULL,
  storage_url   text NOT NULL,
  title         varchar(200),
  ocr_summary   text,
  uploaded_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "files_owner_all" ON files
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Alias for app compatibility
CREATE TABLE IF NOT EXISTS public.health_files (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_type     text NOT NULL,
  filename      text NOT NULL,
  title         text NOT NULL DEFAULT '',
  ocr_summary   text NOT NULL DEFAULT '',
  storage_key   text NOT NULL,
  uploaded_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.health_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "health_files_owner_all" ON health_files
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 8. CREDIT USAGE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.credit_usage (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature         varchar(50) NOT NULL,
  tokens_used     integer,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "credit_usage_owner_select" ON credit_usage
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- 9. SUBSCRIPTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  user_id             uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tier                varchar(20) NOT NULL,
  stripe_customer_id  varchar(100),
  current_period_end  timestamptz,
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscriptions_owner_select" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- 10. CONNECTED DEVICES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.connected_devices (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_identifier   varchar(200) NOT NULL,
  device_model        varchar(100),
  os_version          varchar(50),
  healthkit_connected boolean DEFAULT true,
  last_synced_at      timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  revoked_at          timestamptz
);

ALTER TABLE public.connected_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "connected_devices_owner_all" ON connected_devices
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 11. AGENT CALLS (audit log)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.agent_calls (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query               text,
  tools_called        text[],
  retrieved_context   jsonb,
  raw_response        text,
  safety_warnings     text[],
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agent_calls_owner_select" ON agent_calls
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- 12. VITALS REMINDERS (from v2)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.vitals_reminders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text NOT NULL,
  type            text NOT NULL,
  time            text,
  frequency       text DEFAULT 'daily',
  repeat_days     jsonb DEFAULT '[]',
  completed       boolean DEFAULT false,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE public.vitals_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vitals_reminders_owner_all" ON vitals_reminders
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 13. DAILY ACTIONS (from v2)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.daily_actions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date                date NOT NULL DEFAULT CURRENT_DATE,
  water_logged_ml     integer DEFAULT 0,
  vitamin_d_taken     boolean DEFAULT false,
  breathing_done      boolean DEFAULT false,
  UNIQUE(user_id, date)
);

ALTER TABLE public.daily_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily_actions_owner_all" ON daily_actions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 14. CHATS (from v2)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chats (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role = ANY (ARRAY['user'::text, 'ai'::text])),
  content     text NOT NULL,
  session_id  uuid,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chats_owner_all" ON chats
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_session_id ON chats(session_id);

-- ============================================================
-- 15. SCANS (from v2)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.scans (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  identified_name   text,
  interaction_check text,
  conflict          boolean DEFAULT false,
  created_at        timestamptz DEFAULT now()
);

ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scans_owner_all" ON scans
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 16. SESSIONS (from v2)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address      text,
  user_agent      text,
  device_info     jsonb DEFAULT '{}',
  login_method    text DEFAULT 'google',
  logged_in_at    timestamptz DEFAULT now(),
  last_active_at  timestamptz DEFAULT now(),
  is_active       boolean DEFAULT true
);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions_owner_all" ON sessions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_last_active_at ON sessions(last_active_at);

-- ============================================================
-- 17. ACTIVITY LOGS (from v3)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action      text NOT NULL,
  details     jsonb DEFAULT '{}',
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity_logs_owner_all" ON activity_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);

-- ============================================================
-- 18. DAILY RECOMMENDATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.daily_recommendations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date                date NOT NULL,
  recommendation_json text NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily_recommendations_owner_all" ON daily_recommendations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- VERIFICATION
-- ============================================================
SELECT 'All tables created successfully!' AS message;