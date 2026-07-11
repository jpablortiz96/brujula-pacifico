# Arquitectura

BRÚJULA es una aplicación **Next.js 16 (App Router)** desplegada en Vercel, con
**Supabase (PostgreSQL)** como capa de datos y el **API de Anthropic** como motor
del copiloto conversacional.

## Vista general

```
   Ciudadano / alcalde / periodista
              │
              ▼
   ┌────────────────────────────┐
   │  Next.js 16 (App Router)   │   UI Brutal-Gov · React · Tailwind v4
   │  · Landing / Comparador    │
   │  · Zonas olvidadas / Radar │
   │  · Copiloto (chat + tools) │
   └──────────┬─────────────────┘
              │ Route Handlers (app/api/*)
      ┌───────┴────────────┐
      ▼                    ▼
┌───────────────┐   ┌──────────────────────────┐
│  Supabase     │   │  Anthropic API           │
│  PostgreSQL   │   │  claude-sonnet-5 (agente)│
│  · RPCs/SQL   │   │  claude-haiku-4-5 (clasif)│
│  · PostgREST  │   └──────────┬───────────────┘
└──────┬────────┘              │ tool use
       │                       ▼
       │            9 herramientas del agente
       │            (consultan Supabase + datos.gov.co)
       ▼
  Ingesta (scripts/*.ts) ← datos.gov.co (API Socrata)
```

## Capas

### 1. Ingesta (`scripts/*.ts`)
Scripts en `tsx` que descargan datos abiertos vía API Socrata, los normalizan y
los cargan a Supabase. Incluyen enriquecimiento DIVIPOLA (geolocalización) y
clasificación de sectores. Los datos crudos descargados no se versionan.

### 2. Datos (`supabase/*.sql` + `lib/supabase/`)
Esquema PostgreSQL con tablas `municipios`, `secop_contratos`, `educacion_establecimientos`,
`sisben_personas`, `medicina_lesiones`, `indicadores`, `anomalias`, `bitacora` y
`whatsapp_sesiones`. La lógica pesada vive en **funciones RPC** de Postgres
(agregaciones, cruces sectoriales, detección de zonas olvidadas) con índices de
cobertura para responder dentro del `statement_timeout`.

### 3. Aplicación (`app/`, `components/`, `lib/`)
- **Route Handlers** (`app/api/*`) — endpoints del copiloto, export PDF, WhatsApp.
- **Componentes** (`components/brujula/*`) — UI institucional, tablas, chat.
- **Queries** (`lib/queries/*`) — acceso tipado a Supabase con fallbacks.

### 4. Copiloto agéntico (`lib/agent/`)
Un agente sobre `claude-sonnet-5` con **9 herramientas** que consultan datos reales:

| Herramienta                        | Qué consulta                                       |
|------------------------------------|----------------------------------------------------|
| `consultar_indicadores_municipio`  | Ficha de indicadores de un municipio               |
| `consultar_secop`                  | Contratos SECOP II (municipio, sector, fechas)     |
| `consultar_educacion`              | Cobertura y establecimientos educativos            |
| `consultar_pobreza_sisben`         | Pobreza / población vulnerable (Sisbén)            |
| `consultar_violencia`              | Indicadores de violencia (Medicina Legal)          |
| `detectar_zonas_olvidadas`         | Municipios con alto gasto y baja mejora social     |
| `buscar_dataset_datosgovco`        | Búsqueda en vivo en el catálogo datos.gov.co       |
| `consultar_gasto_por_sector`       | Distribución del gasto por sector                  |
| `consultar_cruce_sectorial`        | Cruce gasto ↔ indicador social                     |

La clasificación de sectores de contratos usa `claude-haiku-4-5` por costo/latencia.

## Despliegue

- **Vercel** para el frontend y los Route Handlers (funciones serverless).
- El export PDF usa `@sparticuz/chromium` + `puppeteer-core`, declarados en
  `serverExternalPackages` de `next.config.ts` y con `maxDuration` ampliado.
- **Supabase** gestionado para PostgreSQL. Ver [DEPLOY.md](DEPLOY.md).
