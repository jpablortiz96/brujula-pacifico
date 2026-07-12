# Diccionario de datos

No contiene datos personales. Ejemplos son seguros o sinteticos.

| Tabla | Variable | Tipo | Definicion | Fuente | Transformacion | Nulabilidad | Ejemplo seguro | Uso analitico | Riesgo |
|---|---|---|---|---|---|---|---|---|---|
| `municipios` | `divipola` | text | Codigo municipio | DANE | normalizado a 5 digitos | no | `52835` | llave territorial | errores de emparejamiento |
| `municipios` | `nombre` | text | Nombre municipio | DANE | capitalizacion | no | Tumaco | UI | homonimos |
| `municipios` | `departamento` | text | Departamento | DANE | catalogo | no | Nariño | filtros | grafia |
| `municipios` | `sisben_pob_vulnerable` | numeric | Poblacion vulnerable estimada | Sisbén | sum `fex` grupos A/B | si | `91333` | denominador per capita | corte/snapshot |
| `secop_contratos` | `valor_contrato` | numeric | Valor contratado COP | SECOP | parse monetario | si | `1000000` | inversion | valores extremos |
| `secop_contratos` | `fecha_firma` | date | Fecha firma | SECOP | parse fecha | si | `2026-07-09` | filtros | fechas faltantes |
| `secop_contratos` | `codigo_municipio` | text | Municipio geolocalizado | SECOP/DIVIPOLA | matcher | si | `76001` | agregacion | subregistro |
| `secop_contratos` | `sector_inferido` | text | Sector aproximado | objeto SECOP | keywords + LLM | si | Educacion | radar/mi-plata | clasificacion aproximada |
| `secop_contratos` | `sector_confianza` | text | Confianza sectorial | clasificador | alta/media | si | alta | auditoria | no es probabilidad formal |
| `sisben_personas` | `grupo` | text | Grupo Sisbén | Sisbén | sin microdatos en docs | si | A | vulnerabilidad | sensibilidad si se publica microdato |
| `sisben_personas` | `fex` | numeric | Factor expansion | Sisbén/DANE | suma agregada | si | `1.25` | poblacion estimada | mal uso como conteo simple |
| `sisben_personas` | `zona` | text | Urbano/rural | Sisbén | normalizacion | si | `2` | contexto | codificacion |
| `educacion_establecimientos` | `cantidad_sedes` | integer | Numero de sedes | MEN | parse numerico | si | `3` | radar educacion | inventario |
| `educacion_establecimientos` | `total_matricula` | integer | Matricula | MEN | parse numerico | si | `250` | contexto educativo | corte |
| `medicina_lesiones` | `manera` | text | Manera de muerte | Medicina Legal | normalizacion texto | si | Homicidio | violencia relativa | clasificacion fuente |
| `medicina_lesiones` | `año_hecho` | text | Año del hecho | Medicina Legal | parse fuente | si | `2024` | temporal | no siempre filtrado |
| RPC zonas | `score_olvido` | numeric | Score 0-1 | calculado | formula 40/30/30 | no | `0.949` | ranking | no causal |
| RPC zonas | `calidad_dato_secop` | text | Calidad de cero/inversion | calculado | reglas v4 | no | `cero_verificado` | salvedad | interpretacion indebida |
| RPC zonas | `pct_vulnerable` | numeric | Porcentaje vulnerable | Sisbén | grupos A/B | si | `93.4` | score | muestra/corte |
| `bitacora` | `consulta` | text | Pregunta del usuario | app/agente | guardado server-side | no | "Compara Tumaco..." | trazabilidad | no debe incluir secretos |
| `whatsapp_sesiones` | `telefono` | text | Identificador de sesion | Twilio | se usa server-side | no | no publicar | contexto WhatsApp | dato personal si se expone |

