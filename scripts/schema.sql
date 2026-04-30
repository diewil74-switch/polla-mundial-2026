-- ============================================
-- SCHEMA SQL PARA POLLA MUNDIAL 2026
-- ============================================
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLA: profiles
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  total_points INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para profiles
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_total_points ON profiles(total_points DESC);

-- ============================================
-- TABLA: teams
-- ============================================
CREATE TABLE IF NOT EXISTS teams (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  flag_emoji TEXT NOT NULL,
  group_id TEXT NOT NULL CHECK (group_id ~ '^[A-L]$'),
  confederation TEXT NOT NULL CHECK (confederation IN ('UEFA', 'CONMEBOL', 'CONCACAF', 'CAF', 'AFC', 'OFC')),
  fifa_ranking INT,
  eliminated BOOLEAN NOT NULL DEFAULT false
);

-- Índices para teams
CREATE INDEX IF NOT EXISTS idx_teams_group_id ON teams(group_id);
CREATE INDEX IF NOT EXISTS idx_teams_eliminated ON teams(eliminated);

-- ============================================
-- TABLA: matches
-- ============================================
CREATE TABLE IF NOT EXISTS matches (
  id SERIAL PRIMARY KEY,
  match_number INT NOT NULL UNIQUE CHECK (match_number >= 1 AND match_number <= 104),
  phase TEXT NOT NULL CHECK (phase IN ('groups', 'r16', 'r8', 'r4', 'sf', '3rd', 'final')),
  group_id TEXT CHECK (group_id IS NULL OR group_id ~ '^[A-L]$'),
  home_team_id INT REFERENCES teams(id) ON DELETE SET NULL,
  away_team_id INT REFERENCES teams(id) ON DELETE SET NULL,
  home_team_label TEXT,
  away_team_label TEXT,
  match_date TIMESTAMPTZ NOT NULL,
  venue TEXT NOT NULL,
  city TEXT NOT NULL,
  home_score INT,
  away_score INT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'finished', 'postponed', 'cancelled')),
  winner_team_id INT REFERENCES teams(id) ON DELETE SET NULL
);

-- Índices para matches
CREATE INDEX IF NOT EXISTS idx_matches_match_number ON matches(match_number);
CREATE INDEX IF NOT EXISTS idx_matches_phase ON matches(phase);
CREATE INDEX IF NOT EXISTS idx_matches_group_id ON matches(group_id);
CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(match_date);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_home_team ON matches(home_team_id);
CREATE INDEX IF NOT EXISTS idx_matches_away_team ON matches(away_team_id);

-- ============================================
-- TABLA: predictions
-- ============================================
CREATE TABLE IF NOT EXISTS predictions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  match_id INT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  pred_home INT NOT NULL CHECK (pred_home >= 0),
  pred_away INT NOT NULL CHECK (pred_away >= 0),
  points_earned INT NOT NULL DEFAULT 0,
  calculated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, match_id)
);

-- Índices para predictions
CREATE INDEX IF NOT EXISTS idx_predictions_user_id ON predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_match_id ON predictions(match_id);
CREATE INDEX IF NOT EXISTS idx_predictions_calculated ON predictions(calculated);

-- ============================================
-- TABLA: special_predictions
-- ============================================
CREATE TABLE IF NOT EXISTS special_predictions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  value TEXT NOT NULL,
  points_earned INT NOT NULL DEFAULT 0,
  deadline TIMESTAMPTZ NOT NULL,
  locked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para special_predictions
CREATE INDEX IF NOT EXISTS idx_special_predictions_user_id ON special_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_special_predictions_type ON special_predictions(type);
CREATE INDEX IF NOT EXISTS idx_special_predictions_locked ON special_predictions(locked);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_predictions ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
DROP POLICY IF EXISTS "Los usuarios pueden ver todos los perfiles" ON profiles;
CREATE POLICY "Los usuarios pueden ver todos los perfiles"
  ON profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Los usuarios pueden actualizar su propio perfil" ON profiles;
CREATE POLICY "Los usuarios pueden actualizar su propio perfil"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Los usuarios pueden insertar su propio perfil" ON profiles;
CREATE POLICY "Los usuarios pueden insertar su propio perfil"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Políticas para teams (solo lectura para usuarios)
DROP POLICY IF EXISTS "Todos pueden ver los equipos" ON teams;
CREATE POLICY "Todos pueden ver los equipos"
  ON teams FOR SELECT
  USING (true);

-- Políticas para matches (solo lectura para usuarios)
DROP POLICY IF EXISTS "Todos pueden ver los partidos" ON matches;
CREATE POLICY "Todos pueden ver los partidos"
  ON matches FOR SELECT
  USING (true);

-- Políticas para predictions
DROP POLICY IF EXISTS "Los usuarios pueden ver todas las predicciones" ON predictions;
CREATE POLICY "Los usuarios pueden ver todas las predicciones"
  ON predictions FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Los usuarios pueden insertar sus propias predicciones" ON predictions;
CREATE POLICY "Los usuarios pueden insertar sus propias predicciones"
  ON predictions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden actualizar sus propias predicciones" ON predictions;
CREATE POLICY "Los usuarios pueden actualizar sus propias predicciones"
  ON predictions FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden eliminar sus propias predicciones" ON predictions;
CREATE POLICY "Los usuarios pueden eliminar sus propias predicciones"
  ON predictions FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para special_predictions
DROP POLICY IF EXISTS "Los usuarios pueden ver todas las predicciones especiales" ON special_predictions;
CREATE POLICY "Los usuarios pueden ver todas las predicciones especiales"
  ON special_predictions FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Los usuarios pueden insertar sus propias predicciones especiales" ON special_predictions;
CREATE POLICY "Los usuarios pueden insertar sus propias predicciones especiales"
  ON special_predictions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden actualizar sus propias predicciones especiales" ON special_predictions;
CREATE POLICY "Los usuarios pueden actualizar sus propias predicciones especiales"
  ON special_predictions FOR UPDATE
  USING (auth.uid() = user_id AND NOT locked);

DROP POLICY IF EXISTS "Los usuarios pueden eliminar sus propias predicciones especiales" ON special_predictions;
CREATE POLICY "Los usuarios pueden eliminar sus propias predicciones especiales"
  ON special_predictions FOR DELETE
  USING (auth.uid() = user_id AND NOT locked);

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger para actualizar updated_at en predictions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_predictions_updated_at ON predictions;
CREATE TRIGGER update_predictions_updated_at
  BEFORE UPDATE ON predictions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_special_predictions_updated_at ON special_predictions;
CREATE TRIGGER update_special_predictions_updated_at
  BEFORE UPDATE ON special_predictions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para crear perfil automáticamente cuando se registra un usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger en auth.users (solo si no existe)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- COMENTARIOS
-- ============================================

COMMENT ON TABLE profiles IS 'Perfiles de usuario con información de la polla';
COMMENT ON TABLE teams IS 'Equipos participantes del Mundial 2026';
COMMENT ON TABLE matches IS 'Partidos del Mundial 2026 (fase de grupos y eliminatorias)';
COMMENT ON TABLE predictions IS 'Predicciones de usuarios para cada partido';
COMMENT ON TABLE special_predictions IS 'Predicciones especiales (campeón, goleador, etc.)';
