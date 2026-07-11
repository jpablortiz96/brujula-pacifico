# Datos abiertos utilizados

Todos los datos provienen de fuentes **abiertas y oficiales** del Estado colombiano,
publicadas en el portal **datos.gov.co** (API Socrata) o en los portales de las
entidades responsables. BRÚJULA no crea datos: los cruza, geolocaliza y explica.

## Datasets base (ingestados a Supabase)

| # | Dataset                                   | Entidad             | Fuente / API         | Uso en BRÚJULA                                        |
|---|-------------------------------------------|---------------------|----------------------|-------------------------------------------------------|
| 1 | SECOP II — Contratos electrónicos         | Colombia Compra Eficiente | datos.gov.co · Socrata `jbjy-vk9h` | Gasto público por municipio, sector, proveedor y fecha |
| 2 | Establecimientos y matrícula educativa    | Ministerio de Educación (MEN) | datos.gov.co · Socrata | Cobertura educativa por municipio                     |
| 3 | Sisbén IV — Registro de población         | DNP / Prosperidad Social | datos.gov.co · Socrata | Pobreza y población vulnerable por municipio          |
| 4 | Lesiones / violencia (Medicina Legal)     | Instituto Nacional de Medicina Legal | datos.gov.co · Socrata | Indicador de violencia territorial                    |

## Catálogo en vivo (consultado en tiempo real por el copiloto)

| Fuente                     | Entidad | Uso                                                             |
|----------------------------|---------|-----------------------------------------------------------------|
| Catálogo datos.gov.co      | MinTIC  | La herramienta `buscar_dataset_datosgovco` busca y consulta cualquier dataset abierto del catálogo nacional bajo demanda |

## Referencia geográfica

| Dataset  | Entidad | Uso                                                    |
|----------|---------|--------------------------------------------------------|
| DIVIPOLA | DANE    | Códigos y nombres oficiales de departamentos y municipios; base de la geolocalización |

## Principios de tratamiento

- **Solo datos agregados / públicos.** No se almacena información que permita
  identificar a personas naturales; el Sisbén se usa a nivel de conteos por municipio.
- **Trazabilidad.** Cada respuesta del copiloto cita la fuente y el dataset consultado.
- **Reproducibilidad.** Los scripts de ingesta (`scripts/ingest-*.ts`) documentan
  el origen exacto; los datasets crudos descargados **no** se versionan (ver `.gitignore`).
