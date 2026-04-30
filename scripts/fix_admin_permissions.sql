-- ============================================
-- FIX ADMIN PERMISSIONS
-- ============================================
-- Asegura que los administradores puedan actualizar partidos
-- ============================================

-- Ver políticas actuales en matches
SELECT * FROM pg_policies WHERE tablename = 'matches';

-- Eliminar política restrictiva si existe
DROP POLICY IF EXISTS "Enable update for admins only" ON matches;

-- Crear política que permita a los admins actualizar matches
CREATE POLICY "Enable update for admins only"
ON matches FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Verificar que la política se creó correctamente
SELECT * FROM pg_policies WHERE tablename = 'matches' AND policyname = 'Enable update for admins only';
