# Especificacion de API

Todas las rutas estan en `app/api/**` y usan `runtime = "nodejs"`.

| Metodo | Ruta | Proposito | Params/body | Respuesta | Errores | Runtime | Dependencias | Seguridad |
|---|---|---|---|---|---|---|---|---|
| GET | `/api/dashboard/kpis` | KPIs SECOP | query filtros dashboard | JSON KPIs | 500 con detalle | nodejs | Supabase RPC | sin secretos en cliente |
| GET | `/api/dashboard/municipios` | stats mapa | query filtros | lista municipios | 500 | nodejs | Supabase RPC | server route |
| GET | `/api/dashboard/contratos` | tabla contratos | filtros, page, pageSize | rows/total | 500 | nodejs | Supabase | limita page |
| GET | `/api/zonas` | zonas olvidadas | ninguno | zonas/sin_datos | 500 | nodejs | RPC zonas | datos agregados |
| GET | `/api/comparador` | lista/comparacion | `a`, `b` opcional | municipios o comparacion | 400/500 | nodejs | Supabase/RPC | agregados |
| GET | `/api/sectores` | gasto sectorial/cruce | `divipola` o `sector`, fechas | sectores/municipios | 400/500 | nodejs | RPC sectores | agregados |
| GET | `/api/sectores/contratos` | contratos por sector | `divipola`, `sector`, fechas | lista contratos | 400/500 | nodejs | Supabase | no service role al cliente |
| GET | `/api/simulador` | escenario inversion | `divipola` | escenario JSON | 400/500 | nodejs | Supabase/RPC | no causal |
| GET | `/api/paquete` | paquete offline | `divipola` | JSON territorial | 400/500 | nodejs | Supabase/RPC | datos agregados |
| GET | `/api/export` | ZIP CSV/metadatos | `tipo`, `a`, `b` | zip | 400/500 | nodejs, max 60 | JSZip/Supabase | no datos personales |
| GET | `/api/brief` | PDF brief | `divipola`, `tipo` | PDF | 400/500 con `requestId` | nodejs, max 60 | Puppeteer/Chromium | no-store |
| POST | `/api/agent/chat` | Chat SSE | body `{messages, rol}` | event-stream | event `error` | nodejs, max 60 | Anthropic/Supabase/Socrata | requiere `ANTHROPIC_API_KEY` |
| GET | `/api/bitacora` | memoria | filtros query | bitacora JSON | 500 | nodejs | Supabase | no tokens |
| GET | `/api/buscar-dataset` | busqueda Socrata | `q` | datasets | 400/500 | nodejs | datos.gov.co | publico |
| POST | `/api/whatsapp/webhook` | Twilio inbound | form Twilio | TwiML vacio | 401 firma invalida | nodejs, max 60 | Twilio/Anthropic/Supabase | valida firma en prod |

## Ejemplos sin secretos

```bash
curl "https://brujula-pacifico.vercel.app/api/dashboard/kpis"
curl "https://brujula-pacifico.vercel.app/api/sectores?divipola=52835"
curl "https://brujula-pacifico.vercel.app/api/brief?divipola=76001&tipo=municipio" -o brief.pdf
```

Ver especificacion de referencia parcial en [openapi.yaml](openapi.yaml).

