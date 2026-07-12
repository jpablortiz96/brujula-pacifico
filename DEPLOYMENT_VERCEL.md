# Deployment en Vercel

Esta guia deja el repositorio listo para desplegar BRUJULA en Vercel sin
cambiar diseno, funcionalidades ni logica de negocio.

## Configuracion exacta de Vercel

- Project: importar `https://github.com/jpablortiz96/brujula-pacifico`.
- Framework Preset: `Next.js`.
- Root Directory: raiz del repositorio. Dejar el campo vacio o usar `.`. No
  seleccionar una carpeta `brujula`.
- Install Command: automatico de Vercel con `package-lock.json` (`npm install`).
- Build Command: `npm run build`.
- Output Directory: automatico de Next.js. No configurar manualmente.
- Node.js Version: `22.x`. Tambien queda fijado en `package.json` con
  `engines.node`.
- No se requiere `vercel.json`; Next.js debe quedar con deteccion automatica.

## Variables de entorno requeridas

Configurar en Vercel para Production, Preview y Development segun corresponda.

| Variable | Uso | Exposicion |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase. | Cliente y servidor |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key publica de Supabase. | Cliente y servidor |
| `SUPABASE_SERVICE_ROLE_KEY` | Consultas backend, RPCs, ingesta y exports. | Solo servidor/scripts |
| `ANTHROPIC_API_KEY` | Copiloto IA y clasificacion por LLM. | Solo servidor/scripts |

## Variables opcionales

| Variable | Uso | Exposicion |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | URL publica de la app para enlaces absolutos. | Cliente y servidor |
| `TWILIO_ACCOUNT_SID` | Canal WhatsApp por Twilio. | Solo servidor |
| `TWILIO_AUTH_TOKEN` | Validacion de firma y envio por Twilio. | Solo servidor |
| `TWILIO_WHATSAPP_FROM` | Remitente WhatsApp, por ejemplo `whatsapp:+14155238886`. | Solo servidor |

No usar valores reales en el repositorio. `.env.local` debe permanecer local e
ignorado por Git.

## Rutas que deben probarse

Pruebas publicas sin credenciales especiales del navegador:

- `/`
- `/dashboard`
- `/zonas-olvidadas`
- `/comparador`
- `/mi-plata`
- `/radar`
- `/simulador`
- `/brief`
- `/agente`
- `/whatsapp`
- `/offline`

Pruebas API con credenciales de entorno configuradas:

- `GET /api/dashboard/kpis`
- `GET /api/dashboard/municipios`
- `GET /api/dashboard/contratos`
- `GET /api/zonas`
- `GET /api/comparador`
- `GET /api/sectores?divipola=52835`
- `GET /api/paquete?divipola=52835`
- `GET /api/export?tipo=zonas`
- `GET /api/brief?divipola=52835&tipo=municipio`
- `POST /api/agent/chat`
- `POST /api/whatsapp/webhook`

## Runtime y funciones largas

Las rutas API usan `export const runtime = "nodejs"` para evitar Edge Runtime.
Esto es necesario para Supabase admin, Anthropic, Twilio, Puppeteer, Chromium,
ZIP/PDF y procesos que pueden tardar mas.

Rutas con `maxDuration = 60` porque pueden hacer llamadas externas, generar
archivos o procesar despues de responder:

- `/api/agent/chat`
- `/api/brief`
- `/api/export`
- `/api/whatsapp/webhook`

## Puppeteer, Chromium y Vercel Functions

- Versiones fijadas para compatibilidad con Chrome/Chromium 149:
  `@sparticuz/chromium@149.0.0`, `puppeteer-core@25.1.0` y
  `puppeteer@25.1.0`.
- En produccion se usa `puppeteer-core` con `@sparticuz/chromium`.
- En local se usa `puppeteer` como dependencia de desarrollo para obtener el
  Chromium local.
- `next.config.ts` mantiene `serverExternalPackages` para
  `@sparticuz/chromium`, `puppeteer-core` y `puppeteer`.
- `next.config.ts` incluye `outputFileTracingIncludes` limitado a `/api/brief`
  para empaquetar `node_modules/@sparticuz/chromium/bin/**` dentro del trace de
  la funcion.
- La generacion de PDF escribe la respuesta en memoria y no depende de archivos
  permanentes en el filesystem de Vercel.
- La generacion ZIP usa `JSZip` en memoria y devuelve el `ArrayBuffer`.

## Prueba de /api/brief

Despues de desplegar, probar:

```bash
curl -i "https://<dominio-vercel>/api/brief?divipola=76001&tipo=municipio" -o brujula-brief-cali.pdf
```

Validar:

- HTTP `200`.
- `Content-Type: application/pdf`.
- `Content-Disposition: attachment; filename="brujula-brief-cali.pdf"`.
- El archivo inicia con `%PDF`.
- El tamano es mayor a 10 KB.
- El PDF tiene maximo dos paginas y el footer no invade el contenido.

Si la respuesta es JSON de error, contiene:

- `error`: mensaje legible.
- `code`: `PDF_BROWSER_LAUNCH_FAILED` o `PDF_GENERATION_FAILED`.
- `requestId`: identificador para buscar la ejecucion en logs.

En Vercel, abrir **Project > Logs > Runtime Logs**, filtrar por la ruta
`/api/brief` o por el `requestId` y revisar las etapas:
`start`, `data_ready`, `html_ready`, `chromium_path_ready`, `browser_ready`,
`pdf_ready`, `complete` o `error`.

## Webhook de Twilio

En Twilio Console:

- Producto: Messaging / WhatsApp Sandbox o WhatsApp Sender productivo.
- Campo `When a message comes in`:
  `https://<dominio-vercel>/api/whatsapp/webhook`
- Metodo: `POST`.
- Variables requeridas si WhatsApp esta habilitado:
  `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`.

En produccion, la ruta valida `x-twilio-signature` cuando
`TWILIO_AUTH_TOKEN` existe. La URL configurada en Twilio debe coincidir con el
dominio publico exacto de Vercel.

## Limitaciones conocidas

- La app necesita Supabase poblado con los scripts SQL y la ingesta de datos para
  que las pantallas dinamicas muestren datos reales.
- Las rutas con Anthropic requieren `ANTHROPIC_API_KEY`; sin ella el build puede
  pasar, pero esas llamadas fallaran en runtime.
- El canal WhatsApp es opcional; sin variables Twilio la pagina informativa carga,
  pero el webhook no puede enviar respuestas.
- Puppeteer/Chromium corre en memoria de la funcion serverless; PDFs muy grandes
  o paginas con recursos externos pesados pueden agotar tiempo o memoria.
