# Despliegue

BRÚJULA se despliega en **Vercel** (aplicación) + **Supabase** (base de datos).

## Requisitos

- Node.js 20+
- Cuenta de Supabase (proyecto PostgreSQL)
- API key de Anthropic
- (Opcional) Cuenta Twilio para el canal WhatsApp

## 1. Supabase

1. Crear un proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor**, ejecutar los scripts de `supabase/` en orden, empezando por
   `schema.sql`, luego `schema-datasets.sql`, `schema-whatsapp.sql` y las
   `functions-*.sql` (RPCs e índices).
3. Copiar de **Project Settings → API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (solo backend/scripts)

## 2. Ingesta de datos

Con `.env.local` configurado (ver `.env.example`):

```bash
npm run seed:divipola     # municipios del Pacífico
npm run ingest:secop      # contratos SECOP II
# ingestas adicionales según necesidad: ingest-educacion, ingest-sisben, ingest-medicina
```

## 3. Vercel

1. Importar el repositorio en [vercel.com](https://vercel.com).
2. **Root Directory:** `brujula` (la app vive en esa subcarpeta).
3. Framework preset: **Next.js** (build `next build`, autodetectado).
4. Configurar las **variables de entorno** (mismas que `.env.example`):
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_APP_URL`
   (la URL pública de Vercel) y, si se usa WhatsApp, las `TWILIO_*`.
5. Deploy.

## 4. Notas de producción

- **Export PDF.** Usa `@sparticuz/chromium` + `puppeteer-core`, declarados en
  `serverExternalPackages` de `next.config.ts` para que el bundler no los empaquete.
- **Funciones largas.** Las rutas `api/agent/chat`, `api/brief`, `api/export` y
  `api/whatsapp/webhook` declaran `export const maxDuration = 60` (segundos).
- **WhatsApp (opcional).** Configurar el webhook de Twilio apuntando a
  `https://<tu-dominio>/api/whatsapp/webhook`.

## Checklist previo al deploy

- [ ] `.env.local` **no** está versionado (lo cubre `.gitignore`)
- [ ] Variables de entorno cargadas en Vercel
- [ ] Scripts SQL de `supabase/` ejecutados
- [ ] Seed + ingesta corridos
- [ ] `npm run build` pasa localmente
- [ ] `Root Directory` = `brujula` en Vercel
