# Matriz de alineacion con el concurso

No se autoasignan puntajes. La tabla presenta evidencia para que el jurado evalúe.

| Criterio | Puntaje maximo | Evidencia | Ruta en demo | Codigo | Documento | Estado | Limitacion |
|---|---:|---|---|---|---|---|---|
| Innovacion y creatividad | 20 | Cruce territorial, score auditable, agente con tools, PWA/WhatsApp | `/zonas-olvidadas`, `/agente`, `/offline`, `/whatsapp` | `lib/agent/`, `lib/queries/zonas.ts`, `public/sw.js` | `README.md`, `docs/00_GUIA_EVALUADOR.md` | listo | No es declaracion administrativa |
| Uso de datos abiertos | 20 | SECOP, Sisbén, Educacion, Medicina Legal, DIVIPOLA, Socrata vivo | `/dashboard`, `/mi-plata`, `/radar` | `scripts/ingest-*.ts`, `lib/socrata/` | `docs/fuentes_datos.md`, `docs/DATOS.md` | listo | Datos crudos no se duplican en Git |
| Analisis y rigor tecnico | 20 | CRISP-ML(Q), validaciones, score con gate, calidad SECOP | `/zonas-olvidadas`, `/simulador` | `supabase/functions-zonas-olvidadas-v4.sql`, `scripts/validate-*` | `docs/marco_metodologico.md`, `docs/validation_guide.md` | listo | No hay pruebas unitarias formales |
| Impacto y escalabilidad | 20 | 178 municipios, actores publicos, exportaciones, brecha digital | `/`, `/whatsapp`, `/offline` | `lib/export/`, `app/api/paquete` | `docs/public_impact_assessment.md` | listo | Escalamiento a otras regiones no implementado |
| Uso de tecnologias emergentes e IA | 10 | Claude con tool use, clasificacion LLM, no alucinacion por herramientas | `/agente` | `lib/agent/tools.ts`, `lib/clasificacion/llm-clasificador.ts` | `models/agentic-ai/README.md` | listo | No usa RAG vectorial ni embeddings |
| Diseno, comunicacion y usabilidad | 10 | UI brutal-gov, capturas reales, README visual, demo desplegada | todas | `components/brujula/`, `docs/assets/readme/` | `README.md`, `docs/assets/readme/README-ASSETS.md` | listo | Algunas vistas densas requieren revision continua en movil |

## Checklist de entregables

Estados permitidos: listo, en validacion, pendiente, no aplica.

| Entregable | Estado | Evidencia |
|---|---|---|
| Solucion funcional | listo | Demo Vercel |
| Documentacion | listo | `README.md`, `docs/README.md`, `EVALUACION.md` |
| Repositorio | listo | GitHub |
| Datos abiertos | listo | `docs/fuentes_datos.md` |
| Metodologia | listo | `docs/marco_metodologico.md`, `docs/CRISP-ML.md` |
| Arquitectura | listo | `docs/architecture/README.md` |
| Impacto | listo | `docs/public_impact_assessment.md` |
| Publicacion en Usos | listo | `docs/public_impact_assessment.md |
| Presentacion | listo | en `RECURSOS/` del checkout principal |
| PDF | listo | `/brief`, `app/api/brief` |
| Portada | listo | Recurso local detectado no versionado |
| Demo | listo | <https://brujula-pacifico.vercel.app> |

