-- ======================================================================
-- BRÚJULA · Columnas de sector inferido para secop_contratos
-- Ejecutar en Supabase SQL Editor ANTES de scripts/clasificar-sectores.ts
-- ======================================================================

alter table secop_contratos add column if not exists sector_inferido text;
alter table secop_contratos add column if not exists sector_confianza text;

create index if not exists idx_secop_sector
  on secop_contratos(sector_inferido);
create index if not exists idx_secop_sector_muni
  on secop_contratos(codigo_municipio, sector_inferido);

comment on column secop_contratos.sector_inferido is
  'Sector inferido del objeto contractual (aproximado: keywords + LLM).';
comment on column secop_contratos.sector_confianza is
  'Confianza de la inferencia: alta | media.';
