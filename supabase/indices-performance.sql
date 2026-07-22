-- ======================================================================
-- BRUJULA · Indices y estadisticas para consultas analiticas.
-- Ejecutar manualmente en Supabase SQL Editor despues de la ingesta.
-- ======================================================================

create index if not exists idx_secop_muni_valor
  on secop_contratos(codigo_municipio, valor_contrato);

create index if not exists idx_secop_depto_fecha
  on secop_contratos(departamento, fecha_firma);

create index if not exists idx_sisben_muni_grupo
  on sisben_personas(codigo_municipio, grupo);

create index if not exists idx_medicina_muni_manera
  on medicina_lesiones(codigo_municipio, manera);

create index if not exists idx_edu_muni
  on educacion_establecimientos(codigo_municipio);

analyze secop_contratos;
analyze sisben_personas;
analyze medicina_lesiones;
analyze educacion_establecimientos;
