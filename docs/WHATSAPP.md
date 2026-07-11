# BRÚJULA por WhatsApp (Twilio Sandbox)

Acceso al agente de BRÚJULA vía WhatsApp para líderes comunitarios sin computador.

## Arquitectura

Twilio hace timeout si el webhook no responde en segundos, pero el agente tarda
10–40 s. Solución: el webhook responde **inmediato** con un TwiML vacío y procesa
el mensaje de forma **asíncrona** con `after()` de `next/server`, enviando la
respuesta real vía la REST API de Twilio (`enviarWhatsApp`).

- Webhook: `app/api/whatsapp/webhook/route.ts`
- Agente no-streaming reutilizable: `lib/agent/run-agent.ts`
- Helpers Twilio (cliente, formateo WhatsApp, chunking 1500): `lib/whatsapp/twilio.ts`
- Sesiones (historial por teléfono, truncado a 6): tabla `whatsapp_sesiones`

> Se usó `after()` (existe en Next 16). Corre tras enviar la respuesta HTTP,
> dentro de la misma invocación serverless (equivalente a `waitUntil`).

## Configuración

1. Variables de entorno (`.env.local` y en Vercel):

   ```
   TWILIO_ACCOUNT_SID=ACxxxx…
   TWILIO_AUTH_TOKEN=xxxxx
   TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
   ```

2. Ejecuta el esquema en Supabase SQL Editor:

   ```
   supabase/schema-whatsapp.sql
   ```

## Prueba local con ngrok

1. `npm run dev`
2. `ngrok http 3000` → copia la URL `https://xxxx.ngrok-free.app`
3. Twilio Console → **Messaging → Try it out → WhatsApp Sandbox Settings**:
   - *When a message comes in* = `https://xxxx.ngrok-free.app/api/whatsapp/webhook`
   - Método: **POST**
4. Únete al sandbox: envía `join <código>` al número del sandbox por WhatsApp.
5. Manda `ayuda` → debe responder el menú. Luego `¿cómo está Tumaco?`.
6. Debug: revisa los logs de tu consola y **Monitor → Logs → Errors** en Twilio.

> En local la validación de firma se **advierte** pero no bloquea (la URL pública
> de ngrok difiere). En producción (`NODE_ENV=production`) una firma inválida
> devuelve 401.

## Comandos

- `ayuda` / `menu` / `hola` → menú de bienvenida.
- `reiniciar` → borra el historial de la sesión.
- Cualquier otra cosa → va al agente (rol `ciudadano`, lenguaje simple).

## Troubleshooting

| Error | Causa | Solución |
|---|---|---|
| **11200** (HTTP retrieval failure / timeout) | El webhook tardó demasiado en responder | Verifica que respondes el TwiML vacío **antes** de llamar al agente (ya lo hace vía `after()`). Revisa que la URL del webhook sea correcta y accesible. |
| **63016** (fuera de la ventana de 24 h) | Twilio solo permite mensajes libres dentro de 24 h desde el último mensaje del usuario | El usuario debe escribir primero; en sandbox, reenvía `join <código>`. |
| **Firma inválida (401)** | `x-twilio-signature` no coincide | Asegura que `TWILIO_AUTH_TOKEN` es correcto y que la URL pública (proto+host+path) coincide con la configurada en Twilio. Detrás de proxy usa `x-forwarded-proto`/`x-forwarded-host`. |
| No llega respuesta | Falta `TWILIO_WHATSAPP_FROM` o credenciales | Revisa las env vars; mira los logs `[whatsapp]`. |
| Respuesta cortada / mensajes desordenados | Sandbox limita a ~1 msg cada 3 s | `enviarWhatsApp` parte en chunks de 1200, espera 3.2 s entre cada uno y envía máximo 3 (el resto se recorta). El prompt pide ≤900 caracteres para que casi siempre quepa en 1 mensaje. |
