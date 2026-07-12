# Notebooks

BRUJULA no usa notebooks como fuente primaria. Usa scripts TypeScript reproducibles y documentacion versionada.

| Bloque sugerido | Equivalente real |
|---|---|
| 01 EDA | `scripts/inspect-*`, `docs/DATOS.md` |
| 02 limpieza | `scripts/ingest-*`, `scripts/enrich-*` |
| 03 analisis descriptivo | RPC SQL, `lib/queries/` |
| 04 modelo | score SQL, clasificacion y simulador |
| 05 reportes | dashboard, brief PDF, exportaciones, capturas README |

No se crean `.ipynb` vacios ni codigo Python ficticio.

