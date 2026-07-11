-- ======================================================================
-- BRÚJULA · Población Sisbén autoritativa por municipio
-- Ejecutar en Supabase SQL Editor ANTES de scripts/enrich-sisben-poblacion.ts
--
-- Estas columnas guardan la población EXPANDIDA (sum del factor de expansión
-- fex del DANE) calculada sobre el dataset COMPLETO de datos.gov.co, no sobre
-- la muestra capada de sisben_personas. Son el denominador correcto para el
-- per cápita del detector de zonas olvidadas v3.
-- ======================================================================

alter table municipios add column if not exists sisben_pob_total       numeric;
alter table municipios add column if not exists sisben_pob_vulnerable  numeric;

comment on column municipios.sisben_pob_total is
  'Población Sisbén expandida total = sum(fex) sobre dataset completo hq2v-5umk.';
comment on column municipios.sisben_pob_vulnerable is
  'Población Sisbén vulnerable expandida = sum(fex) grupos A/B, dataset completo.';
