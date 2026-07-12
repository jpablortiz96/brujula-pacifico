# Data

BRUJULA no versiona dumps, bases completas ni microdatos personales. Las fuentes se descargan desde datos.gov.co y se persisten en Supabase/PostgreSQL.

| Directorio | Uso |
|---|---|
| `raw/` | Documenta fuentes externas; no contiene datos crudos masivos |
| `processed/` | Documenta datos normalizados en PostgreSQL |
| `external/` | Referencias externas como DIVIPOLA y catalogo Socrata |
| `realtime/` | Busqueda viva del catalogo datos.gov.co |
| `schemas/` | Esquemas JSON seguros |
| `samples/` | Muestras agregadas o sinteticas |

Ver `DATA_MANIFEST.json` para fuentes y scripts.

