# Mapeo de estructura del concurso a BRUJULA

La plantilla del concurso esta orientada a Python, notebooks, modelos predictivos y despliegues tradicionales. BRUJULA usa Next.js 16, TypeScript, Supabase/PostgreSQL, RPC SQL, Claude con tool use, Socrata, Twilio, Puppeteer y Vercel. Este mapeo evita crear archivos ficticios.

| Estructura sugerida | Implementacion real en BRUJULA | Ubicacion | Evidencia | Justificacion tecnica |
|---|---|---|---|---|
| `requirements.txt` | Dependencias Node reproducibles | `package.json`, `package-lock.json` | Scripts y versiones fijadas | En npm, el lockfile equivale al freeze reproducible |
| `environment.yml` | Runtime Node, variables y deploy | `package.json#engines`, `.env.example`, `DEPLOYMENT_VERCEL.md` | Node `22.x`, variables listadas | No usa Conda; Vercel usa Node/npm |
| `src/agents/` | Agente territorial | `lib/agent/` | `tools.ts`, `run-agent.ts`, `system-prompt.ts` | Tool use con Claude y fuentes reales |
| `src/data_pipeline/` | Ingesta/enriquecimiento | `scripts/`, `lib/socrata/`, `lib/divipola/` | `ingest-*`, `enrich-*`, parsers | Pipeline TypeScript versionable |
| `src/features/` | Clasificacion, queries y normalizacion | `lib/clasificacion/`, `lib/queries/`, `lib/socrata/` | Sectores, parsers, consultas | Features analiticas viven en TS/SQL |
| `models/predictive/` | Score analitico y RPC | `supabase/functions-zonas-olvidadas-v4.sql`, `lib/queries/zonas.ts` | Formula 40/30/30 | No hay modelo predictivo entrenado |
| `models/llm_rag/` | Arquitectura agentica con tool use | `models/agentic-ai/README.md`, `lib/agent/` | 9 herramientas | No se llama RAG porque no hay vector store ni embeddings |
| `models/simulation/` | Simulador de escenarios | `lib/queries/simulador.ts`, `models/simulation/README.md` | Benchmark de pares | Escenario descriptivo, no prediccion |
| `notebooks/` | Scripts reproducibles + docs EDA | `notebooks/README.md`, `scripts/inspect-*`, `docs/DATOS.md` | Inspeccion y validacion | No se crean notebooks vacios |
| `data/raw/` | Fuentes externas por API | `data/raw/README.md`, `data/DATA_MANIFEST.json` | IDs Socrata | No se duplican datos masivos |
| `data/processed/` | Datos normalizados en PostgreSQL | `data/processed/README.md`, `supabase/*.sql` | Tablas y RPC | Persistencia real es Supabase |
| `tests/` | Validaciones reales existentes | `tests/README.md`, `scripts/validate-*` | Validaciones de datos | No hay suite unitaria formal |
| `deployments/` | Serverless/Vercel/Supabase | `docs/DEPLOY.md`, `DEPLOYMENT_VERCEL.md` | Runtime Node, Chromium | No usa Docker/Kubernetes |
| `reports/` | Recursos y evidencias | `reports/README.md`, `docs/assets/readme/` | Capturas y presentacion local documentada | Se enlaza sin duplicar innecesariamente |

