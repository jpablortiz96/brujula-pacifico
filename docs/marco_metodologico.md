# Marco metodologico

BRUJULA aplica CRISP-ML(Q) como marco de calidad para un sistema analitico con IA generativa y herramientas.

| Fase | Implementacion real | Evidencia |
|---|---|---|
| Entendimiento del problema | Pregunta publica, usuarios y alcance | `docs/planteamiento_problema.md` |
| Entendimiento de datos | Fuentes Socrata, DIVIPOLA, periodo | `docs/fuentes_datos.md`, `docs/ANALISIS-PERIODO.md` |
| Preparacion | Ingestas, parsers, enriquecimiento | `scripts/ingest-*`, `scripts/enrich-*`, `lib/socrata/` |
| Modelado analitico | Score, clasificacion sectorial, simulador | `supabase/functions-zonas-olvidadas-v4.sql`, `lib/clasificacion/`, `lib/queries/simulador.ts` |
| Evaluacion | Validaciones y smoke checks | `scripts/validate-*`, `scripts/smoke-pdf.ts` |
| Despliegue | Vercel + Supabase + Node runtime | `docs/DEPLOY.md`, `DEPLOYMENT_VERCEL.md` |
| Monitoreo | Bitacora, logs PDF, capturas reproducibles | `app/bitacora`, `app/api/brief`, `scripts/capture-readme-screenshots.ts` |

## Score de olvido

Formula vigente:

```text
score = 0.40 * baja inversion per capita vulnerable
      + 0.30 * vulnerabilidad
      + 0.30 * violencia relativa
```

Controles:

- `fex`: factor de expansion usado para poblacion vulnerable estimada.
- Gate de muestra: Sisbén `>= 30`.
- Calidad SECOP: `ok`, `cero_verificado`, `posible_subregistro`.
- Municipios con datos insuficientes pasan a verificacion.

## Clasificacion sectorial

`lib/clasificacion/sectores.ts` usa keywords por sector. Cuando hay ambiguedad, `lib/clasificacion/llm-clasificador.ts` usa Claude Haiku. La salida es aproximada y verificable en SECOP.

## Simulador

`lib/queries/simulador.ts` compara el municipio con pares del mismo departamento. Es un escenario de referencia, no una prediccion causal.

## Ausencia de inferencia causal

BRUJULA reporta asociaciones descriptivas. Ningun modulo afirma que una inversion cause directamente un resultado social.

