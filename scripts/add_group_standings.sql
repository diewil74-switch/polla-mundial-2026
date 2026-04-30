-- ============================================
-- AÑADIR TABLA group_standings
-- ============================================
-- Esta tabla almacena el orden real final de cada grupo
-- para calcular el bono por orden (+5 pts)
-- ============================================

CREATE TABLE IF NOT EXISTS group_standings (
  id SERIAL PRIMARY KEY,
  group_id TEXT NOT NULL CHECK (group_id ~ '^[A-L]$'),
  position INT NOT NULL CHECK (position >= 1 AND position <= 4),
  team_id INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  qualified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(group_id, position),
  UNIQUE(group_id, team_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_group_standings_group_id ON group_standings(group_id);
CREATE INDEX IF NOT EXISTS idx_group_standings_qualified ON group_standings(qualified);

-- RLS
ALTER TABLE group_standings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos pueden ver group_standings" ON group_standings;
CREATE POLICY "Todos pueden ver group_standings"
  ON group_standings FOR SELECT
  USING (true);

-- Comentario
COMMENT ON TABLE group_standings IS 'Orden real final de cada grupo para calcular bono por orden exacto';
