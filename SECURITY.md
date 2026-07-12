# Security Policy

## Reporte responsable

Reportar vulnerabilidades abriendo un issue privado o contactando al mantenedor del repositorio antes de divulgar detalles publicamente.

## Secretos

No subir `.env`, llaves Supabase, service role, `ANTHROPIC_API_KEY`, tokens Twilio ni dumps.

Variables sensibles que deben permanecer server-side:

- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`

## Datos personales

Sisbén debe usarse solo agregado en documentos y muestras. No versionar microdatos, telefonos, historiales completos ni identificadores personales.

## Endpoints

Twilio valida firma en produccion cuando existe `TWILIO_AUTH_TOKEN`. PDF y agente usan runtime Node.js.

## Dependencias

Ejecutar `npm audit` periodicamente y revisar impacto antes de actualizar dependencias criticas como Next.js, Puppeteer, Chromium y Twilio.

