# 🚀 Guía de Configuración - Polla Mundial 2026

## ✅ Pasos completados

- ✅ Schema SQL creado (`scripts/schema.sql`)
- ✅ Seed SQL creado (`scripts/seed.sql`)
- ✅ Base de datos configurada en Supabase
- ✅ Autenticación implementada
- ✅ Páginas de Login y Registro
- ✅ Página de Reglas
- ✅ Middleware de protección de rutas
- ✅ Dashboard básico

## 📝 Pasos para configurar el proyecto

### 1. Configurar variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```bash
cp .env.local.example .env.local
```

Edita `.env.local` y agrega tus credenciales de Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**¿Dónde obtener las credenciales?**
1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Settings → API
3. Copia `Project URL` y `anon/public key`

### 2. Ejecutar el servidor de desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

### 3. Configurar autenticación en Supabase

1. Ve a tu proyecto en Supabase
2. Authentication → URL Configuration
3. Agrega las siguientes URLs:

**Site URL:**
```
http://localhost:3000
```

**Redirect URLs:**
```
http://localhost:3000
http://localhost:3000/dashboard
```

## 🗄️ Base de datos

La base de datos ya está configurada con:
- ✅ 5 tablas (profiles, teams, matches, predictions, special_predictions)
- ✅ 48 equipos en 12 grupos
- ✅ 104 partidos (72 fase de grupos + 32 eliminatorios)
- ✅ Partidos numerados cronológicamente (ejecutar `scripts/renumber_matches.sql`)
- ✅ Row Level Security (RLS) habilitado
- ✅ Triggers para auto-crear perfiles

**IMPORTANTE:** Después de ejecutar `seed.sql`, debes ejecutar `renumber_matches.sql` para ordenar los partidos cronológicamente:
```sql
-- En el SQL Editor de Supabase:
-- 1. Ejecutar scripts/schema.sql
-- 2. Ejecutar scripts/seed.sql
-- 3. Ejecutar scripts/renumber_matches.sql
```

## 🔐 Autenticación

### Flujo de autenticación:
1. Usuario se registra en `/register`
2. El trigger de la DB crea automáticamente el perfil
3. Usuario es redirigido a `/dashboard`

### Protección de rutas (middleware.ts):
- `/` → Redirige a `/dashboard` si hay sesión activa
- `/register` → Redirige a `/dashboard` si hay sesión activa
- `/dashboard/*` → Requiere autenticación
- `/admin/*` → Requiere role='admin'
- `/rules` → Página pública

## 📊 Estructura del proyecto

```
polla-mundial-2026/
├── app/
│   ├── auth/signout/route.ts    # Cerrar sesión
│   ├── dashboard/page.tsx       # Dashboard principal
│   ├── register/page.tsx        # Registro
│   ├── rules/page.tsx           # Reglas públicas
│   ├── page.tsx                 # Login
│   ├── layout.tsx               # Layout principal
│   └── globals.css              # Estilos globales
├── lib/
│   └── supabase/
│       ├── client.ts            # Cliente Supabase (browser)
│       └── server.ts            # Cliente Supabase (server)
├── scripts/
│   ├── schema.sql               # DDL de la base de datos
│   ├── seed.sql                 # Datos iniciales
│   └── reset.sql                # Limpiar datos
├── docs/
│   ├── fixture.md               # Fixture del mundial
│   └── rules.md                 # Reglas de puntuación
├── middleware.ts                # Protección de rutas
└── .env.local                   # Variables de entorno (no incluido)
```

## 🎨 Diseño

**Paleta de colores:**
- Rojo principal: `#DC2626`
- Rojo claro: `#FCA5A5`
- Fondo suave: `#FEF2F2`
- Texto principal: `#1F2937`

**Tipografía:**
- Albert Sans (Google Fonts)

## ✅ Dashboard Completo

El dashboard ahora incluye:
- ✅ **Predicciones** - Ver y hacer predicciones de los 72 partidos de fase de grupos
- ✅ **Calendario** - Ver todos los 104 partidos organizados por fase
- ✅ **Grupos** - Tablas de posiciones de los 12 grupos con estadísticas
- ✅ **Ranking** - Tabla de clasificación de todos los participantes
- ✅ **Especiales** - Predicciones especiales (campeón, subcampeón, goleador, MVP)

## ✅ Panel de Administración Completo

El panel de administración está completo con 4 pestañas:
- ✅ **Resultados** - Ingresar resultados de partidos y recalcular puntos automáticamente
- ✅ **Bracket** - Gestionar bracket eliminatorio con asignación manual o auto-completar desde resultado
- ✅ **Usuarios** - Ver todos los usuarios registrados y asignar/quitar rol de admin
- ✅ **Ranking** - Tabla de clasificación global con filas expandibles mostrando desglose de puntos (grupos, eliminatorias, especiales)

## 🔜 Próximos pasos

Pendiente:
- [ ] Bono de orden de grupo
- [ ] Notificaciones por email cuando se acerca deadline de predicciones

## 📞 Soporte

Si tienes problemas:
1. Verifica que las variables de entorno estén correctas
2. Asegúrate de haber ejecutado `schema.sql` y `seed.sql` en Supabase
3. Revisa que la configuración de Auth URLs esté correcta en Supabase
