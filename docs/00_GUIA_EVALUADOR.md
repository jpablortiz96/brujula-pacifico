# Guia ampliada para evaluadores

## Indice de evidencias

| Evidencia | Donde revisar |
|---|---|
| Demo en produccion | <https://brujula-pacifico.vercel.app> |
| Guia rapida | `EVALUACION.md` |
| README visual | `README.md` |
| Matriz concurso | `docs/evidence/competition-matrix.md` |
| Arquitectura | `docs/architecture/README.md`, `docs/ARQUITECTURA.md` |
| Datos abiertos | `docs/fuentes_datos.md`, `docs/DATOS.md` |
| Metodologia | `docs/marco_metodologico.md`, `docs/CRISP-ML.md` |
| API | `docs/api_spec.md`, `docs/openapi.yaml` |
| Reproducibilidad | `docs/reproducibilidad.md` |
| Validacion | `docs/validation_guide.md`, `tests/README.md` |
| Capturas | `docs/assets/readme/README-ASSETS.md` |

## Recorrido de 5 minutos

1. `00:00`: leer hallazgo de Argelia en `EVALUACION.md`.
2. `00:40`: abrir `/zonas-olvidadas`.
3. `01:30`: abrir `/agente`; observar tool use disponible.
4. `02:20`: abrir `/mi-plata`; revisar Tumaco.
5. `03:00`: abrir `/comparador` o `/simulador`.
6. `03:40`: abrir `/brief`; validar interfaz y, si el deployment esta configurado, descargar PDF.
7. `04:15`: abrir `/whatsapp` y `/offline`.
8. `04:45`: revisar `/bitacora` y matriz de evidencias.

## Modulos

| Ruta | Que demuestra |
|---|---|
| `/dashboard` | Contratacion georreferenciada y filtros SECOP |
| `/zonas-olvidadas` | Score auditable con gate de muestra y calidad de dato |
| `/agente` | IA con herramientas reales, no respuestas libres |
| `/mi-plata` | Transparencia ciudadana por sector y contratos |
| `/comparador` | Brechas entre municipios |
| `/simulador` | Escenarios honestos sin causalidad |
| `/radar` | Cruce descriptivo gasto-sector e indicadores |
| `/brief` | Generacion documental con fuentes |
| `/bitacora` | Memoria institucional |
| `/whatsapp` | Acceso por baja conectividad |
| `/offline` | PWA y paquetes territoriales |

## Checklist reproducible

```bash
npm ci
npm run typecheck
npm run lint
npm run build
npx tsx scripts/capture-readme-screenshots.ts
```

No ejecutar ingestas ni scripts que escriban Supabase salvo que se disponga de un entorno seguro y variables no productivas.

