-- ============================================================
-- MuscleVision — Schéma PostgreSQL (Supabase)
-- Exécuter dans l'éditeur SQL de Supabase
-- ============================================================

-- Extension pour gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Utilisateurs ──────────────────────────────────────────────────────────────
-- Étend auth.users de Supabase
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url TEXT,
    height_cm INTEGER,
    weight_kg DECIMAL(5,2),
    goal TEXT CHECK (goal IN ('muscle_gain', 'fat_loss', 'endurance', 'general')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Sessions d'entraînement ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workout_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    video_url TEXT,
    source TEXT DEFAULT 'upload'
        CHECK (source IN ('upload', 'webcam')),
    video_format TEXT,
    status TEXT DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'done', 'error')),
    exercise_type TEXT,
    correctness_score INTEGER CHECK (correctness_score >= 0 AND correctness_score <= 100),
    duration_seconds INTEGER,
    analysis_text TEXT,
    analysis_artifact_url TEXT,
    keypoints_artifact_url TEXT,
    feedback TEXT,
    rep_count INTEGER DEFAULT 0,
    tempo_seconds DECIMAL(6,2),
    symmetry_score DECIMAL(4,3),
    stability_score DECIMAL(4,3),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- ── Engagement musculaire ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS muscle_engagement (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
    muscle_name TEXT NOT NULL,
    engagement_value DECIMAL(4,3) NOT NULL
        CHECK (engagement_value >= 0 AND engagement_value <= 1),
    UNIQUE(session_id, muscle_name)
);

-- ── Journal alimentaire ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS food_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    logged_at TIMESTAMPTZ DEFAULT NOW(),
    meal_type TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
    food_name TEXT NOT NULL,
    photo_url TEXT,
    calories INTEGER,
    protein_g DECIMAL(6,2),
    carbs_g DECIMAL(6,2),
    fat_g DECIMAL(6,2),
    portion_multiplier DECIMAL(4,2) DEFAULT 1.0,
    source TEXT DEFAULT 'manual'
        CHECK (source IN ('photo_ai', 'manual', 'search'))
);

-- ── Conversations avec les coaches ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coach_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    coach_id TEXT NOT NULL CHECK (coach_id IN ('max', 'sergeant', 'dr_reed', 'bro')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, coach_id)
);

-- ── Messages du chat ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coach_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES coach_conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    workout_context JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Index pour les performances ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_id ON workout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_food_log_user_date ON food_log(user_id, logged_at);
CREATE INDEX IF NOT EXISTS idx_coach_messages_convo ON coach_messages(conversation_id, created_at);

ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'upload'
    CHECK (source IN ('upload', 'webcam'));
ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS video_format TEXT;
ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS analysis_text TEXT;
ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS analysis_artifact_url TEXT;
ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS keypoints_artifact_url TEXT;
ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS feedback TEXT;
ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS rep_count INTEGER DEFAULT 0;
ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS tempo_seconds DECIMAL(6,2);
ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS symmetry_score DECIMAL(4,3);
ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS stability_score DECIMAL(4,3);

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE muscle_engagement ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_messages ENABLE ROW LEVEL SECURITY;

-- Politiques : chaque utilisateur ne voit que ses propres données
CREATE POLICY "users_own" ON users FOR ALL USING (id = auth.uid());
CREATE POLICY "workouts_own" ON workout_sessions FOR ALL USING (user_id = auth.uid());
CREATE POLICY "muscle_own" ON muscle_engagement FOR ALL
    USING (session_id IN (SELECT id FROM workout_sessions WHERE user_id = auth.uid()));
CREATE POLICY "food_own" ON food_log FOR ALL USING (user_id = auth.uid());
CREATE POLICY "coach_convos_own" ON coach_conversations FOR ALL USING (user_id = auth.uid());
CREATE POLICY "coach_msgs_own" ON coach_messages FOR ALL
    USING (conversation_id IN (SELECT id FROM coach_conversations WHERE user_id = auth.uid()));
