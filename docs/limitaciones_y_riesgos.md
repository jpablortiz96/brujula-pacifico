# Limitaciones y riesgos

| Limitacion/riesgo | Impacto | Mitigacion |
|---|---|---|
| SECOP no siempre tiene municipio preciso | Subregistro territorial | `calidad_dato_secop` y salvedades |
| Sisbén y educacion son cortes | Filtros temporales no uniformes | `docs/ANALISIS-PERIODO.md` |
| Score no causal | Mala interpretacion | advertencia en docs/UI |
| Clasificacion sectorial aproximada | Error de sector | enlaces a SECOP y confianza |
| LLM puede fallar | Respuestas incompletas | herramientas, fuentes, bitacora |
| WhatsApp depende de Twilio | Canal no disponible si faltan vars | documentacion de webhook |
| PDF depende de Chromium serverless | Fallos por memoria/tiempo | runtime Node, logs, `requestId` |
| Datos personales | Riesgo alto si se publican microdatos | no subir dumps, solo agregados |

