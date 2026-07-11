-- ======================================================================
-- BRÚJULA · Schema de datasets adicionales (adaptado al schema real)
-- Ejecutar en Supabase SQL Editor
-- ======================================================================

-- ──────────────────────────────────────────────────────────────────────
-- 1. Establecimientos educativos MEN — dataset cfw5-qzt5
--    Columnas reales: codigo_dane (PK), departamento, municipio,
--    cod_dane_municipio, nombre_establecimiento, sector, caracter,
--    calendario, total_matricula, cantidad_sedes, a_o
-- ──────────────────────────────────────────────────────────────────────
create table if not exists educacion_establecimientos (
  id               text primary key,   -- codigo_dane
  a_o              text,               -- año de reporte
  nombre_estab     text,               -- nombre_establecimiento
  departamento     text,
  municipio        text,
  codigo_municipio text,               -- cod_dane_municipio (DIVIPOLA 5 dígitos)
  sector           text,               -- OFICIAL / NO_OFICIAL
  caracter         text,               -- carácter del establecimiento
  calendario       text,               -- A / B
  total_matricula  integer,
  cantidad_sedes   integer,
  raw              jsonb,
  ingested_at      timestamptz default now()
);
create index if not exists idx_edu_muni  on educacion_establecimientos(codigo_municipio);
create index if not exists idx_edu_depto on educacion_establecimientos(departamento);
create index if not exists idx_edu_sector on educacion_establecimientos(sector);

comment on table educacion_establecimientos is
  'Establecimientos educativos MEN para el Pacífico. Fuente: datos.gov.co cfw5-qzt5';

-- ──────────────────────────────────────────────────────────────────────
-- 2. Sisbén Personas DNP — dataset hq2v-5umk
--    Columnas reales: cod_mpio (único geo), grupo, clasificacion,
--    nivel, zona, fex (factor expansión), corte (período)
--    Sin columna departamento ni municipio texto
-- ──────────────────────────────────────────────────────────────────────
create table if not exists sisben_personas (
  id               text primary key,   -- cod_mpio-llave-orden (sintético)
  codigo_municipio text,               -- cod_mpio (DIVIPOLA 5 dígitos)
  grupo            text,               -- A, B, C, D
  clasificacion    text,               -- A1, B1, C1, C2, C3, D1-D4
  nivel            text,               -- 1, 2, 3, 4
  zona             text,               -- 1=urbano, 2=rural
  fex              numeric(15, 5),     -- factor de expansión poblacional
  corte            text,               -- período SIV_YYYY
  raw              jsonb,
  ingested_at      timestamptz default now()
);
create index if not exists idx_sis_muni  on sisben_personas(codigo_municipio);
create index if not exists idx_sis_grupo on sisben_personas(grupo);
create index if not exists idx_sis_zona  on sisben_personas(zona);

comment on table sisben_personas is
  'Personas Sisbén IV del Pacífico (microdata). Fuente: datos.gov.co hq2v-5umk';

-- ──────────────────────────────────────────────────────────────────────
-- 3. Lesiones fatales — Medicina Legal — dataset 2kpj-cktv
--    Columnas reales: id, a_o_del_hecho, mes_del_hecho,
--    codigo_dane_departamento, codigo_dane_municipio,
--    departamento_del_hecho_dane, municipio_del_hecho_dane,
--    sexo_de_la_victima, grupo_de_edad_de_la_victima, ciclo_vital,
--    manera_de_muerte, mecanismo_causal, escenario_del_hecho, zona_del_hecho
-- ──────────────────────────────────────────────────────────────────────
create table if not exists medicina_lesiones (
  id               text primary key,   -- año-id sintético
  año_hecho        text,               -- a_o_del_hecho
  mes_hecho        text,               -- mes_del_hecho
  departamento     text,               -- departamento_del_hecho_dane
  municipio        text,               -- municipio_del_hecho_dane
  codigo_municipio text,               -- codigo_dane_municipio (DIVIPOLA 5 dígitos)
  sexo             text,               -- sexo_de_la_victima
  edad_grupo       text,               -- grupo_de_edad_de_la_victima
  ciclo_vital      text,
  manera           text,               -- manera_de_muerte (Homicidio, Accidente, etc.)
  mecanismo        text,               -- mecanismo_causal
  escenario        text,               -- escenario_del_hecho
  zona             text,               -- zona_del_hecho
  raw              jsonb,
  ingested_at      timestamptz default now()
);
create index if not exists idx_med_muni   on medicina_lesiones(codigo_municipio);
create index if not exists idx_med_depto  on medicina_lesiones(departamento);
create index if not exists idx_med_año    on medicina_lesiones(año_hecho);
create index if not exists idx_med_manera on medicina_lesiones(manera);

comment on table medicina_lesiones is
  'Lesiones fatales Medicina Legal para el Pacífico. Fuente: datos.gov.co 2kpj-cktv';
