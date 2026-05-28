# Preparación para cambio de Supabase (Data API Grants)

## ⚠️ Cambio importante de Supabase

A partir de **octubre 30, 2026**, Supabase cambiará la forma en que las tablas se exponen a la Data API:
- **Nuevas tablas** NO se expondrán automáticamente
- Requerirán **GRANTS explícitos** para ser accesibles vía supabase-js
- **Tablas existentes** NO se verán afectadas

## ✅ Estado actual del proyecto

### Tu proyecto está SEGURO porque:
1. ✅ Todas tus tablas actuales **ya existen** - mantendrán sus permisos
2. ✅ El schema.sql **ya está actualizado** con los GRANTS necesarios
3. ✅ Si creas nuevas tablas usando el schema.sql actualizado, funcionarán correctamente

### No necesitas hacer nada AHORA, pero...

## 📋 Recomendaciones para octubre 2026

### Opción 1: NO hacer nada (más simple)
**Si no planeas crear nuevas tablas**, simplemente espera hasta octubre 2026:
- Tus tablas actuales seguirán funcionando
- No necesitas ejecutar ningún comando
- Solo asegúrate de usar el `schema.sql` actualizado si creas nuevas tablas

### Opción 2: Adoptar el nuevo comportamiento AHORA (más seguro)
Si quieres prepararte anticipadamente:

1. **Ejecuta estos comandos en Supabase SQL Editor:**

```sql
-- Cambiar defaults para futuras tablas (no afecta tablas existentes)
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE USAGE, SELECT ON SEQUENCES FROM anon, authenticated, service_role;
```

2. **Desde ese momento:**
   - Nuevas tablas requerirán GRANTS explícitos
   - Usa el `schema.sql` actualizado para crear tablas
   - Tus tablas existentes seguirán funcionando normalmente

## 🆕 Para crear nuevas tablas en el futuro

Siempre incluye estos tres pasos como una unidad:

```sql
-- 1. CREAR LA TABLA
CREATE TABLE public.nueva_tabla (
  id SERIAL PRIMARY KEY,
  -- ... columnas
);

-- 2. GRANTS (exponer a Data API)
GRANT SELECT ON public.nueva_tabla TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.nueva_tabla TO authenticated;
GRANT ALL ON public.nueva_tabla TO service_role;
GRANT USAGE, SELECT ON SEQUENCE nueva_tabla_id_seq TO authenticated, service_role;

-- 3. ROW LEVEL SECURITY
ALTER TABLE public.nueva_tabla ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS RLS
CREATE POLICY "nombre_politica"
  ON public.nueva_tabla
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
```

## 📝 Resumen

| Qué | Cuándo | Acción necesaria |
|-----|--------|------------------|
| **Tablas existentes** | Ahora y siempre | ✅ Ninguna - siguen funcionando |
| **Schema actualizado** | Ahora | ✅ Ya está hecho |
| **Nuevas tablas antes Oct 2026** | Si usas Opción 1 | Usar schema.sql como referencia |
| **Nuevas tablas después Oct 2026** | Obligatorio | Usar schema.sql (ya tiene los GRANTS) |

## 🎯 Mi recomendación

**Para tu proyecto específico:**
1. No hagas nada ahora - tus tablas están seguras
2. Si necesitas crear nuevas tablas, usa el `schema.sql` actualizado como referencia
3. En septiembre 2026, verifica que todo siga funcionando
4. Si tienes problemas después del cambio, revisa este documento

## 🔗 Referencias
- [Anuncio oficial de Supabase](https://github.com/orgs/supabase/discussions/42180)
- Fecha del cambio: **30 de octubre de 2026**
