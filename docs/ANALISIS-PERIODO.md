# Análisis: ¿qué módulos necesitan filtro de período?

Contexto: la contratación SECOP tiene `fecha_firma` (2017–2026). Otros datasets
son de naturaleza distinta:

- **SECOP** (`secop_contratos`): serie temporal → filtrable por período.
- **Sisbén** (`sisben_personas`, `municipios.sisben_pob_*`): un **corte** (foto),
  no una serie → NO tiene sentido filtrar por período.
- **Educación** (`educacion_establecimientos`): inventario de sedes (acumulado).
- **Medicina Legal** (`medicina_lesiones`): tiene `fecha_hecho` → filtrable, pero
  hoy no se filtra.

La regla general: **solo lo derivado de SECOP debe filtrarse por período**;
mezclar inversión de un período con población/indicadores acumulados produce
comparaciones engañosas.

## Módulos y veredicto

| Módulo | ¿Filtro de período? | Estado | Razón |
|---|---|---|---|
| **/dashboard** | Sí | ✅ Ya lo tiene (FiltersBar) | Todo lo que muestra viene de SECOP (contratos, valor, KPIs). Default `{}` = todo. |
| **/mi-plata** | Sí | ✅ Implementado | "¿En qué se gastó?" es 100% SECOP y muy sensible al período. |
| **/radar** | Sí (solo inversión) | ✅ Implementado | La inversión sectorial se filtra; el indicador de resultado (sedes, homicidios) NO — es acumulado. Documentado en la nota. |
| **/zonas-olvidadas** | Opcional, baja prioridad | ⏳ No | El "score de olvido" mezcla inversión (SECOP), vulnerabilidad (Sisbén, corte) y violencia (Medicina Legal). Filtrar solo la inversión por período rompería la coherencia del score. El abandono estructural es acumulativo → dejar "todo el histórico" es lo defendible. Si se quisiera, habría que rediseñar el score para un período (inversión del período ÷ población del corte). |
| **/comparador** | Parcial, media prioridad | ⏳ No | Comparar contratos/valor por período sí tiene sentido; pero pob. vulnerable, homicidios y sedes son cortes/acumulados. Un filtro que aplique **solo a las filas de SECOP** (contratos, valor, per cápita) sería correcto; el resto se queda. Requiere separar visualmente "métricas de período" de "métricas estructurales". |
| **/simulador** | No necesario, baja prioridad | ⏳ No | Usa la inversión **total histórica** como línea base frente al promedio de pares. Eso es lo correcto: "¿cuánto ha recibido este municipio en total vs. sus pares?". Un período parcializaría la base sin aportar rigor. |
| **/agente** | Implícito | ⏳ No | El agente puede razonar sobre períodos si las tools lo soportan. Las tools sectoriales (`consultar_gasto_por_sector`, `consultar_cruce_sectorial`) ya aceptan fechas en la RPC; faltaría exponer el parámetro en el `input_schema` si se quiere que el agente filtre por año. |

## Recomendación priorizada

1. **Hecho:** /mi-plata y /radar con filtro de período (este entregable).
2. **Verificar:** /dashboard — confirmar que los presets de fecha llegan a las RPC.
3. **Siguiente natural:** exponer `p_fecha_inicio`/`p_fecha_fin` en las tools del
   agente para responder "¿en qué se gastó Quibdó en 2024?".
4. **A discutir:** /comparador con filtro parcial (solo métricas SECOP).
5. **No tocar:** /zonas-olvidadas y /simulador — su lógica es acumulativa por
   diseño; un filtro de período confundiría más que aclarar.

> Nota transversal: el filtro solo es útil con datos frescos. Tras la re-ingesta
> incremental (contratos 2025–2026), los presets "Último año" / "Últimos 2 años"
> pasan a devolver resultados reales.
