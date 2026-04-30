-- ============================================
-- RENUMERAR PARTIDOS CRONOLÓGICAMENTE
-- ============================================
-- Este script renumera todos los partidos del 1 al 104
-- en orden cronológico según match_date
-- ============================================

-- PASO 1: Eliminar temporalmente el constraint de match_number
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_match_number_check;
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_match_number_key;

-- PASO 2: Asignar números temporales (1000 + id) para evitar conflictos
UPDATE matches
SET match_number = 1000 + id;

-- PASO 3: Crear una tabla temporal con los nuevos números cronológicos
WITH numbered_matches AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY match_date, id) AS new_match_number
  FROM matches
)
-- PASO 4: Actualizar con los números correctos
UPDATE matches m
SET match_number = nm.new_match_number
FROM numbered_matches nm
WHERE m.id = nm.id;

-- PASO 5: Restaurar los constraints
ALTER TABLE matches ADD CONSTRAINT matches_match_number_check
  CHECK (match_number >= 1 AND match_number <= 104);

ALTER TABLE matches ADD CONSTRAINT matches_match_number_key
  UNIQUE (match_number);

-- Verificar el resultado
SELECT match_number, phase, group_id,
       TO_CHAR(match_date AT TIME ZONE 'America/Bogota', 'YYYY-MM-DD HH24:MI') as fecha_colombia,
       home_team_label,
       away_team_label
FROM matches
ORDER BY match_number
LIMIT 30;
