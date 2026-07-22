# Despliegue

BRÚJULA se despliega en **Vercel** (aplicación) + **Supabase** (base de datos).

## Requisitos

- Node.js 22.x
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
2. **Root Directory:** raíz del repositorio (dejar vacío / `.`). No usar una
   subcarpeta `brujula`: `package.json`, `app/` y `next.config.ts` están en la
   raíz del repositorio.
3. Framework preset: **Next.js** (build `next build`, autodetectado).
4. Configurar las **variables de entorno** (mismas que `.env.example`):
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_APP_URL`
   (la URL pública de Vercel) y, si se usa WhatsApp, las `TWILIO_*`.
5. Deploy.

## Cache y revalidacion de datos

- Ejecutar `supabase/indices-performance.sql`,
  `supabase/functions-municipios-con-datos.sql` y
  `supabase/functions-zonas-olvidadas-v4.sql` despues de la ingesta. Las
  funciones conservan los calculos existentes, pero agregan cada tabla una vez
  en PostgreSQL en lugar de hacerlo por municipio.
- Ejecutar `supabase/verificar-zonas-ranking.sql` inmediatamente despues. Un
  resultado vacio confirma que las 20 zonas, sus scores y categorias son
  identicos a la implementacion anterior.
- Configurar `REVALIDATE_TOKEN` en Vercel con un valor aleatorio largo. No es
  una variable publica.
- Tras una ingesta, invalidar el cache de datos sin redesplegar:

```bash
curl -X POST https://<tu-dominio>/api/revalidate \
  -H "Authorization: Bearer <REVALIDATE_TOKEN>"
```

Las rutas de datos usan una hora de cache CDN y sirven contenido anterior
mientras Vercel revalida en segundo plano. No se aplica cache HTTP al agente,
al PDF ni al webhook de WhatsApp.

## 4. Notas de producción

- **Export PDF.** Usa `@sparticuz/chromium` + `puppeteer-core`, declarados en
  `serverExternalPackages` de `next.config.ts` para que el bundler no los empaquete.
  Versiones fijadas: `@sparticuz/chromium@149.0.0`,
  `puppeteer-core@25.1.0` y `puppeteer@25.1.0`. La ruta `/api/brief` incluye
  `node_modules/@sparticuz/chromium/bin/**` en el trace de la funcion.
- **Funciones largas.** Las rutas `api/agent/chat`, `api/brief`, `api/export` y
  `api/whatsapp/webhook` declaran `export const maxDuration = 60` (segundos).
- **Debug PDF.** Si `/api/brief` devuelve JSON de error, copia el `requestId` y
  buscalo en **Vercel > Project > Logs > Runtime Logs**. Las etapas esperadas
  son `start`, `data_ready`, `html_ready`, `chromium_path_ready`,
  `browser_ready`, `pdf_ready` y `complete`.
- **WhatsApp (opcional).** Configurar el webhook de Twilio apuntando a
  `https://<tu-dominio>/api/whatsapp/webhook`.

## Checklist previo al deploy

- [ ] `.env.local` **no** está versionado (lo cubre `.gitignore`)
- [ ] Variables de entorno cargadas en Vercel
- [ ] Scripts SQL de `supabase/` ejecutados
- [ ] Seed + ingesta corridos
- [ ] `npm run build` pasa localmente
- [ ] `curl -i https://<tu-dominio>/api/brief?divipola=76001\\&tipo=municipio`
      devuelve `application/pdf`, `%PDF` y un archivo mayor de 10 KB
- [ ] `Root Directory` = raíz del repositorio en Vercel
