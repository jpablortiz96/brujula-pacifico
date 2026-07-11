# Metodología — CRISP-ML(Q)

BRÚJULA se desarrolló siguiendo **CRISP-ML(Q)** (Cross-Industry Standard Process
for Machine Learning with Quality assurance), la adaptación de CRISP-DM a proyectos
con componentes de IA. A continuación, cómo se aplicó cada fase.

## 1. Entendimiento del negocio y de los datos

**Problema.** El gasto público en Colombia es abierto (SECOP) pero ilegible para
la ciudadanía, y no se cruza con resultados sociales. La pregunta guía:
*¿dónde el Estado gastó y el territorio sigue olvidado?*

**Alcance.** Cuatro departamentos del Pacífico (Cauca, Chocó, Nariño, Valle),
178 municipios.

**Datos disponibles.** SECOP II, educación (MEN), Sisbén, violencia (Medicina Legal)
y el catálogo vivo de datos.gov.co. Ver [DATOS.md](DATOS.md).

## 2. Preparación de datos

- Descarga vía API Socrata y normalización (`scripts/ingest-*.ts`).
- **Geolocalización** de contratos con DIVIPOLA (DANE) — 90,7 % de cobertura.
- **Clasificación sectorial** de contratos con `claude-haiku-4-5` sobre el objeto
  del contrato (salud, educación, agua, vías, etc.).
- Limpieza de tipos (p. ej. `fecha_firma` como `DATE`), deduplicación y control de
  valores nulos. Datos crudos fuera del control de versiones.

## 3. Modelado

BRÚJULA no entrena un modelo propio: usa **IA generativa con herramientas** (tool use).

- **Agente** sobre `claude-sonnet-5` con 9 herramientas que consultan datos reales,
  evitando alucinaciones al obligar a que toda cifra venga de una consulta.
- **Índice de "zona olvidada"**: heurística que combina gasto público acumulado con
  indicadores sociales rezagados, calculada en RPCs de Postgres.
- **Clasificador** `claude-haiku-4-5` para sectorizar contratos en la ingesta.

## 4. Evaluación

- **Trazabilidad como métrica de calidad:** cada afirmación del copiloto se respalda
  con la fuente y el dataset consultado; se penaliza cualquier dato sin herramienta.
- Validación de cobertura y consistencia con scripts (`scripts/validate-*.ts`).
- Revisión de casos reales (municipios del Pacífico) para verificar que los cruces
  gasto ↔ indicador son coherentes.

## 5. Despliegue

- Aplicación web en Vercel + Supabase gestionado. Ver [DEPLOY.md](DEPLOY.md).
- Canal ciudadano por **WhatsApp** (Twilio) para consultas sin fricción.
- Export de evidencia en **PDF/ficha** para uso institucional y periodístico.

## 6. Monitoreo y mantenimiento

- Los scripts de ingesta son re-ejecutables para actualizar datos.
- `scripts/check-secop-actualidad.ts` verifica la vigencia de los datos SECOP.
- La arquitectura basada en datos abiertos permite ampliar cobertura a otros
  departamentos reutilizando la misma tubería.

## Aseguramiento de calidad (la "Q")

| Riesgo                          | Mitigación                                             |
|---------------------------------|--------------------------------------------------------|
| Alucinación del LLM             | Toda cifra proviene de una herramienta sobre datos reales |
| Datos desactualizados           | Ingesta re-ejecutable + verificación de actualidad     |
| Sesgo por cobertura incompleta  | Se reporta el % de contratos geolocalizados            |
| Exposición de datos personales  | Solo agregados; Sisbén a nivel de conteos municipales  |
