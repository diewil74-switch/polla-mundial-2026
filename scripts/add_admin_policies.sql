-- ============================================
-- AGREGAR POLÍTICAS RLS PARA ADMINISTRADORES
-- ============================================
-- Permite a los administradores modificar matches
-- ============================================

-- Política para que admins puedan ACTUALIZAR matches
DROP POLICY IF EXISTS "Los administradores pueden actualizar partidos" ON matches;
CREATE POLICY "Los administradores pueden actualizar partidos"
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

-- Política para que admins puedan INSERTAR matches (opcional, por si necesitan crear partidos)
DROP POLICY IF EXISTS "Los administradores pueden insertar partidos" ON matches;
CREATE POLICY "Los administradores pueden insertar partidos"
  ON matches FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Política para que admins puedan ELIMINAR matches (opcional)
DROP POLICY IF EXISTS "Los administradores pueden eliminar partidos" ON matches;
CREATE POLICY "Los administradores pueden eliminar partidos"
  ON matches FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Política para que admins puedan ACTUALIZAR predictions (para recalcular puntos)
DROP POLICY IF EXISTS "Los administradores pueden actualizar predicciones" ON predictions;
CREATE POLICY "Los administradores pueden actualizar predicciones"
  ON predictions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Política para que admins puedan ACTUALIZAR profiles (para actualizar puntos totales)
DROP POLICY IF EXISTS "Los administradores pueden actualizar perfiles" ON profiles;
CREATE POLICY "Los administradores pueden actualizar perfiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Verificar políticas creadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('matches', 'predictions', 'profiles')
ORDER BY tablename, policyname;
