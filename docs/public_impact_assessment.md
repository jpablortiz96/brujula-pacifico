# Evaluacion de impacto publico

## Beneficiarios

- Ciudadania y liderazgos comunitarios.
- Alcaldias y funcionarios territoriales.
- Periodistas y analistas.
- Organizaciones sociales.
- Jurados y equipos de datos abiertos.

## Valor publico

BRUJULA mejora transparencia, priorizacion, participacion y memoria institucional al conectar datos abiertos con preguntas territoriales concretas.

## Matriz de riesgos

| Riesgo | Probabilidad | Impacto | Mitigacion | Evidencia | Riesgo residual |
|---|---|---|---|---|---|
| Interpretar score como acto administrativo | media | alto | advertencias y calidad de dato | README, score docs | medio |
| Confundir asociacion con causalidad | media | alto | simulador no causal y notas metodologicas | `lib/queries/simulador.ts` | medio |
| Subregistro municipal SECOP | media | alto | `calidad_dato_secop` | RPC v4 | medio |
| Alucinacion IA | media | alto | tool use y fuentes | `lib/agent/tools.ts` | bajo/medio |
| Exponer datos personales | baja | alto | no publicar microdatos, agregacion | docs/data | bajo |
| Brecha digital | alta | medio | WhatsApp y PWA | `/whatsapp`, `/offline` | medio |
| Sesgo por cobertura | media | medio | validaciones y documentacion | scripts validate | medio |

## Revision humana

Las salidas deben apoyar revision publica y control social, no reemplazar decisiones administrativas, juridicas o tecnicas.

