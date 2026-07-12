# BRUJULA - Guia rapida para jurados

## 1. Que es en 30 segundos

BRUJULA es un sistema de inteligencia territorial abierta para el Pacifico colombiano. Cruza contratacion publica SECOP II, vulnerabilidad Sisbén, establecimientos educativos, violencia de Medicina Legal y referencia DIVIPOLA para responder si la inversion publica registrada llega donde hay mayor necesidad.

Demo: <https://brujula-pacifico.vercel.app>

## 2. Problema publico

Los datos existen en datos.gov.co, pero estan fragmentados por entidad, formato y lenguaje. BRUJULA los conecta por municipio para convertir evidencia publica en preguntas accionables, trazables y comprensibles para ciudadania, funcionarios, periodistas y organizaciones territoriales.

## 3. Hallazgo principal

Argelia, Cauca, aparece como prioridad de revision territorial: score de olvido `0.949`, 93.4% de vulnerabilidad, 55 homicidios, 9 contratos geolocalizados y $39.006 COP por persona vulnerable estimada. Esto no afirma ausencia absoluta de Estado; senala baja inversion registrada/geolocalizada frente a vulnerabilidad y violencia relativa.

## 4. Ruta de evaluacion recomendada

| Tiempo | Accion |
|---:|---|
| 00:00 | Leer problema y hallazgo de Argelia |
| 00:40 | Abrir `/zonas-olvidadas` y revisar ranking, score y calidad de dato |
| 01:30 | Abrir `/agente` y revisar herramientas disponibles |
| 02:20 | Abrir `/mi-plata` para Tumaco y ver desglose sectorial |
| 03:00 | Comparar Tumaco vs Cali o revisar `/simulador` |
| 03:40 | Abrir `/brief`; probar PDF despues del deployment vigente |
| 04:15 | Revisar `/whatsapp` y `/offline` |
| 04:45 | Cerrar con `/bitacora` y documentacion |

## 5. Fuentes abiertas usadas

| Fuente | ID | Uso |
|---|---|---|
| SECOP II | `jbjy-vk9h` | Contratos, montos, fechas, entidades y objetos |
| Sisbén IV | `hq2v-5umk` | Vulnerabilidad agregada y factor `fex` |
| Establecimientos educativos | `cfw5-qzt5` | Sedes educativas por municipio |
| Lesiones fatales | `2kpj-cktv` | Violencia relativa |
| DIVIPOLA | DANE | Llave territorial y cobertura municipal |
| Catalogo datos.gov.co | Socrata | Busqueda viva de datasets desde el agente |

## 6. Arquitectura resumida

Next.js 16 + TypeScript + Supabase/PostgreSQL + funciones RPC + agente Claude con tool use + Socrata + Twilio + Puppeteer/Chromium + Vercel Functions.

No usa notebooks Python, Spark, embeddings, RAG vectorial ni modelos predictivos entrenados. La equivalencia con la estructura del concurso esta documentada en [docs/mapeo_estructura_concurso.md](docs/mapeo_estructura_concurso.md).

## 7. Evidencias por criterio

Ver matriz completa: [docs/evidence/competition-matrix.md](docs/evidence/competition-matrix.md).

| Criterio | Evidencia clave |
|---|---|
| Innovacion | Cruce territorial, agente con herramientas, score auditable, PWA/WhatsApp |
| Datos abiertos | 4 datasets Socrata + DIVIPOLA + busqueda viva |
| Rigor tecnico | CRISP-ML(Q), validaciones, score con gate, calidad SECOP |
| Impacto | 178 municipios del Pacifico, acceso ciudadano y trazabilidad |
| IA | Claude con tool use; LLM no es fuente de verdad |
| Usabilidad | Demo desplegada, capturas reales, lenguaje ciudadano |

## 8. Que revisar primero

1. [README.md](README.md)
2. [docs/00_GUIA_EVALUADOR.md](docs/00_GUIA_EVALUADOR.md)
3. [docs/evidence/competition-matrix.md](docs/evidence/competition-matrix.md)
4. [docs/DATOS.md](docs/DATOS.md)
5. [docs/CRISP-ML.md](docs/CRISP-ML.md)
6. [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md)

## 9. Reproducir

```bash
npm ci
npm run typecheck
npm run lint
npm run build
```

Reproduccion completa de datos: [docs/reproducibilidad.md](docs/reproducibilidad.md).

## 10. Limitaciones conocidas

- El score prioriza revision; no es declaracion administrativa.
- La asociacion entre inversion e indicadores no es causalidad.
- Sisbén y educacion son cortes/inventarios; no todos los datos admiten filtro temporal.
- PDF en Vercel debe probarse despues de cada deployment.
- WhatsApp depende de configuracion Twilio.

## 11. Estado de entregables

| Entregable | Estado |
|---|---|
| Solucion funcional | listo |
| Repositorio | listo |
| Documentacion tecnica | listo |
| Matriz de concurso | listo |
| Datos abiertos | listo |
| Metodologia | listo |
| Arquitectura | listo |
| Capturas | listo |
| Presentacion | pendiente en repositorio; existen recursos locales no versionados |
| Publicacion en datos.gov.co/usos | pendiente |
| Video | no aplica |

