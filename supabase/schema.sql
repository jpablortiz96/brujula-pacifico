-- ======================================================================
-- BRÚJULA · Schema inicial · Supabase / PostgreSQL
-- Proyecto: "Datos al Ecosistema 2026: IA para Colombia" — MinTIC
-- ======================================================================

create extension if not exists "uuid-ossp";

-- ──────────────────────────────────────────────────────────────────────
-- 1. Catálogo de municipios del Pacífico colombiano (DIVIPOLA)
-- ──────────────────────────────────────────────────────────────────────
create table if not exists municipios (
  divipola      text primary key,
  nombre        text not null,
  departamento  text not null,
  codigo_depto  text not null,
  region        text not null default 'Pacífico',
  poblacion     integer,
  nbi_pct       numeric(5, 2),
  lat           numeric(9, 6),
  lng           numeric(9, 6),
  created_at    timestamptz not null default now()
);

create index if not exists idx_muni_depto on municipios(codigo_depto);

comment on table municipios is
  'Municipios de los 4 departamentos del Pacífico colombiano: Cauca(19), Chocó(27), Nariño(52), Valle del Cauca(76)';

-- ──────────────────────────────────────────────────────────────────────
-- 2. SECOP II — Contratos electrónicos filtrados al Pacífico
-- ──────────────────────────────────────────────────────────────────────
create table if not exists secop_contratos (
  id                       text primary key,
  referencia_contrato      text,
  nombre_entidad           text,
  nit_entidad              text,
  departamento             text,
  ciudad                   text,
  codigo_municipio         text,
  objeto_contrato          text,
  tipo_contrato            text,
  modalidad_contratacion   text,
  estado_contrato          text,
  proveedor_adjudicado     text,
  documento_proveedor      text,
  valor_contrato           numeric(18, 2),
  valor_pagado             numeric(18, 2),
  fecha_firma              date,
  fecha_inicio             date,
  fecha_fin                date,
  duracion                 integer,
  url_proceso              text,
  raw                      jsonb,
  ingested_at              timestamptz not null default now()
);

create index if not exists idx_secop_muni   on secop_contratos(codigo_municipio);
create index if not exists idx_secop_depto  on secop_contratos(departamento);
create index if not exists idx_secop_fecha  on secop_contratos(fecha_firma desc nulls last);
create index if not exists idx_secop_valor  on secop_contratos(valor_contrato desc nulls last);
create index if not exists idx_secop_estado on secop_contratos(estado_contrato);

comment on table secop_contratos is
  'Contratos SECOP II filtrados al Pacífico. Fuente: datos.gov.co dataset jbjy-vk9h';

-- ──────────────────────────────────────────────────────────────────────
-- 3. Bitácora de decisiones — memoria institucional del agente
-- ──────────────────────────────────────────────────────────────────────
create table if not exists bitacora (
  id                  uuid primary key default uuid_generate_v4(),
  actor_rol           text,                                            -- alcalde | lider | periodista | sistema
  municipio_divipola  text references municipios(divipola) on delete set null,
  consulta            text not null,
  hipotesis           text,
  datasets_usados     text[],
  decision            text,
  confianza           numeric(4, 3) check (confianza between 0 and 1),
  metadata            jsonb,
  created_at          timestamptz not null default now()
);

create index if not exists idx_bita_muni   on bitacora(municipio_divipola);
create index if not exists idx_bita_actor  on bitacora(actor_rol);
create index if not exists idx_bita_fecha  on bitacora(created_at desc);

comment on table bitacora is
  'Registro de consultas y decisiones del agente BRÚJULA. Sirve como memoria institucional.';

-- ──────────────────────────────────────────────────────────────────────
-- 4. Indicadores territoriales agregados (caché de datasets procesados)
-- ──────────────────────────────────────────────────────────────────────
create table if not exists indicadores (
  id              uuid primary key default uuid_generate_v4(),
  divipola        text references municipios(divipola) on delete cascade,
  sector          text not null,    -- salud | educacion | agua | conectividad | violencia...
  indicador       text not null,
  valor           numeric,
  unidad          text,
  fuente_dataset  text,             -- ID Socrata del dataset origen
  fecha_corte     date,
  metadata        jsonb,
  updated_at      timestamptz not null default now()
);

create unique index if not exists idx_ind_unique
  on indicadores(divipola, sector, indicador, fecha_corte);
create index if not exists idx_ind_sector
  on indicadores(sector, indicador);
create index if not exists idx_ind_lookup
  on indicadores(divipola, sector, indicador);

comment on table indicadores is
  'Caché de indicadores sociales por municipio. Se refresca desde los datasets de datos.gov.co.';

-- ──────────────────────────────────────────────────────────────────────
-- 5. Anomalías detectadas — zonas olvidadas y contradicciones
-- ──────────────────────────────────────────────────────────────────────
create table if not exists anomalias (
  id           uuid primary key default uuid_generate_v4(),
  divipola     text references municipios(divipola) on delete cascade,
  tipo         text not null,       -- inversion_sin_impacto | dato_faltante | discrepancia | alerta_critica
  severidad    text not null,       -- baja | media | alta | critica
  titulo       text not null,
  descripcion  text,
  score        numeric(5, 3),
  fuentes      text[],
  resuelta     boolean not null default false,
  detected_at  timestamptz not null default now()
);

create index if not exists idx_anomalias_muni      on anomalias(divipola);
create index if not exists idx_anomalias_severidad on anomalias(severidad) where not resuelta;
create index if not exists idx_anomalias_tipo      on anomalias(tipo);

comment on table anomalias is
  'Anomalías detectadas por el agente: inversiones sin impacto, datos faltantes, discrepancias.';

-- ──────────────────────────────────────────────────────────────────────
-- 6. Vistas útiles
-- ──────────────────────────────────────────────────────────────────────

-- Resumen de inversión SECOP por municipio
create or replace view v_inversion_por_municipio as
select
  s.codigo_municipio                                   as divipola,
  m.nombre                                             as municipio,
  m.departamento,
  count(*)                                             as total_contratos,
  sum(s.valor_contrato)                                as valor_total_cop,
  round(avg(s.valor_contrato)::numeric, 2)             as valor_promedio_cop,
  min(s.fecha_firma)                                   as primer_contrato,
  max(s.fecha_firma)                                   as ultimo_contrato
from secop_contratos s
left join municipios m on m.divipola = s.codigo_municipio
group by s.codigo_municipio, m.nombre, m.departamento;

comment on view v_inversion_por_municipio is
  'Agregado de inversión SECOP por municipio para el Pacífico.';
