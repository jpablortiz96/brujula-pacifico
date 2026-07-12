# Fuentes de datos

Los datos crudos no se versionan. Se consultan desde APIs oficiales y se persisten en Supabase/PostgreSQL.

| Fuente | ID Socrata | Entidad | URL | Licencia | Fecha/corte | Cobertura | Campos usados | Transformaciones | Limitaciones | Frecuencia | Evidencia |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SECOP II | `jbjy-vk9h` | Colombia Compra Eficiente | `https://www.datos.gov.co/resource/jbjy-vk9h.json` | datos.gov.co | `fecha_firma` 2017-2026 en produccion | Pacifico filtrado/geolocalizado | contrato, entidad, municipio, valor, fechas, objeto | normalizacion, DIVIPOLA, sector | 90.7% geolocalizado; subregistro municipal posible | Segun fuente | `scripts/ingest-secop.ts`, `secop_contratos` |
| Sisbén IV | `hq2v-5umk` | DNP / Prosperidad Social | `https://www.datos.gov.co/resource/hq2v-5umk.json` | datos.gov.co | corte en dataset | Municipios integrados | `cod_mpio`, `grupo`, `clasificacion`, `zona`, `fex`, `corte` | agregacion y expansion `fex` | No publicar microdatos personales; snapshot | Segun fuente | `scripts/ingest-sisben.ts`, `enrich-sisben-poblacion.ts` |
| Establecimientos educativos | `cfw5-qzt5` | Ministerio de Educacion | `https://www.datos.gov.co/resource/cfw5-qzt5.json` | datos.gov.co | inventario/snapshot | Pacifico | codigo DANE, municipio, sector, sedes, matricula | normalizacion DIVIPOLA | No se filtra temporalmente igual que SECOP | Segun fuente | `scripts/ingest-educacion.ts` |
| Lesiones fatales | `2kpj-cktv` | Medicina Legal | `https://www.datos.gov.co/resource/2kpj-cktv.json` | datos.gov.co | registro integrado | Pacifico | año, municipio, manera, zona, mecanismo | normalizacion municipio | El filtro temporal no esta aplicado en todos los modulos | Segun fuente | `scripts/ingest-medicina.ts` |
| DIVIPOLA | N/A | DANE | catalogo local | publica | catalogo | 178 municipios | codigo, nombre, departamento | matcher/geocoding | Coordenadas requieren auditoria | Cuando cambie DANE | `lib/divipola/` |
| Catalogo Socrata | N/A | datos.gov.co | catalogo API | publica | en vivo | nacional | nombre, entidad, URL, descripcion | busqueda por agente | Resultados dependen del catalogo vivo | En vivo | `buscar_dataset_datosgovco` |

Ver tambien [docs/DATOS.md](DATOS.md).

