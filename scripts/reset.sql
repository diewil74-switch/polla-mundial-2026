-- ============================================
-- RESET DATABASE - LIMPIAR TODOS LOS DATOS
-- ============================================
-- ADVERTENCIA: Esto eliminará TODOS los datos de las tablas
-- Solo ejecutar si quieres reiniciar desde cero
-- ============================================

-- Eliminar todos los partidos y equipos (esto también eliminará predicciones por CASCADE)
TRUNCATE TABLE matches, teams CASCADE;

-- Reiniciar las secuencias para que los IDs comiencen desde 1
ALTER SEQUENCE teams_id_seq RESTART WITH 1;
ALTER SEQUENCE matches_id_seq RESTART WITH 1;
ALTER SEQUENCE predictions_id_seq RESTART WITH 1;
ALTER SEQUENCE special_predictions_id_seq RESTART WITH 1;

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE 'Base de datos limpiada. Ahora puedes ejecutar seed.sql';
END $$;
