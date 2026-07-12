# Tests y validaciones

No hay suite unitaria formal versionada. Las validaciones reales son scripts y comandos de build.

| Tipo | Evidencia | Comando |
|---|---|---|
| TypeScript | compilacion estricta | `npm run typecheck` |
| Lint | ESLint | `npm run lint` |
| Build | Next.js | `npm run build` |
| Calidad datos | validacion general | `npm run validate` |
| Sisbén/fex | balance poblacional | `npm run validate:sisben-balance` |
| Score | zonas olvidadas | `npm run validate:zonas` |
| PDF | smoke PDF | `npm run smoke:pdf` |
| Visual | capturas README | `npx tsx scripts/capture-readme-screenshots.ts` |

Validaciones prioritarias documentadas: score en rango, gate de muestra, fex valido, DIVIPOLA, ceros verificados/subregistro, porcentajes, no NaN, ausencia de datos personales y no causalidad.

