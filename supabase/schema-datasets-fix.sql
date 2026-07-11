-- ======================================================================
-- BRÚJULA · Fix schema educacion + sisben (uuid PK, columnas reales)
-- ======================================================================
-- ADVERTENCIA: borra las tablas actuales.
--   educacion_establecimientos → vacía (0 registros)
--   sisben_personas            → 4.482 registros (solo Cauca, incompleto)
-- ======================================================================

-- ──────────────────────────────────────────────────────────────────────
-- Habilitar uuid-ossp si no está activo
-- ──────────────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ──────────────────────────────────────────────────────────────────────
-- 1. Establecimientos educativos MEN — dataset cfw5-qzt5
--    Columnas reales confirmadas con inspect:
--      codigo_dane, a_o, departamento, municipio, cod_dane_municipio,
--      nombre_establecimiento, sector, calendario, total_matricula,
--      cantidad_sedes
--    PK único real: (codigo_dane, a_o) — 1 fila por establecimiento/año
-- ──────────────────────────────────────────────────────────────────────
drop table if exists educacion_establecimientos cascade;

create table educacion_establecimientos (
  id               uuid primary key default uuid_generate_v4(),
  a_o              text,
  codigo_dane      text,
  nombre_estab     text,
  departamento     text,
  municipio        text,
  codigo_municipio text,            -- cod_dane_municipio (DIVIPOLA 5 dígitos)
  sector           text,            -- OFICIAL / NO_OFICIAL
  calendario       text,
  total_matricula  integer,
  cantidad_sedes   integer,
  raw              jsonb,
  ingested_at      timestamptz default now(),
  unique (codigo_dane, a_o)
);

create index if not exists idx_edu_muni  on educacion_establecimientos(codigo_municipio);
create index if not exists idx_edu_depto on educacion_establecimientos(departamento);
create index if not exists idx_edu_dane  on educacion_establecimientos(codigo_dane);
create index if not exists idx_edu_sector on educacion_establecimientos(sector);

comment on table educacion_establecimientos is
  'Establecimientos educativos MEN para el Pacífico. Fuente: datos.gov.co cfw5-qzt5';

-- ──────────────────────────────────────────────────────────────────────
-- 2. Sisbén Personas DNP — dataset hq2v-5umk
--    Columnas reales confirmadas con inspect:
--      cod_mpio (único geo), grupo, clasificacion, nivel, zona, fex,
--      corte, llave, orden  — SIN columna departamento/municipio texto
--    No hay restricción unique: INSERT plano, uuid por fila
-- ──────────────────────────────────────────────────────────────────────
drop table if exists sisben_personas cascade;

create table sisben_personas (
  id               uuid primary key default uuid_generate_v4(),
  codigo_municipio text,            -- cod_mpio (DIVIPOLA 5 dígitos)
  grupo            text,            -- A, B, C, D
  clasificacion    text,            -- A1, B1, C1-C3, D1-D4
  nivel            text,
  zona             text,            -- 1=urbano, 2=rural
  fex              numeric(15,5),
  corte            text,            -- SIV_YYYY
  raw              jsonb,
  ingested_at      timestamptz default now()
);

create index if not exists idx_sis_muni  on sisben_personas(codigo_municipio);
create index if not exists idx_sis_grupo on sisben_personas(grupo);
create index if not exists idx_sis_zona  on sisben_personas(zona);

comment on table sisben_personas is
  'Personas Sisbén IV del Pacífico (muestra). Fuente: datos.gov.co hq2v-5umk';
