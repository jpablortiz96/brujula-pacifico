-- ======================================================================
-- BRÚJULA · Performance del análisis sectorial (arregla el timeout 57014)
-- Ejecutar en Supabase SQL Editor DESPUÉS de functions-sectores-v3.sql.
--
-- Causa: cada fila de secop_contratos tiene un `raw` jsonb pesado. Agregar
-- ~97k filas de un municipio grande (Cali) obligaba a leer la fila completa
-- del heap → se pasaba del statement_timeout.
-- Fix: índices de COBERTURA (INCLUDE) → la agregación es index-only y no
-- toca el jsonb. Además subimos el límite de tiempo por si acaso.
--
-- NOTA: el VACUUM va aparte (no puede correr en transacción). Ver el final.
-- ======================================================================

-- Índices de cobertura: incluyen las columnas que agregan las RPC, así el
-- escaneo es "index-only" (sin heap fetch de la fila con el raw jsonb).
create index if not exists idx_secop_muni_fecha_cov
  on secop_contratos (codigo_municipio, fecha_firma)
  include (sector_inferido, valor_contrato);

create index if not exists idx_secop_sector_fecha_cov
  on secop_contratos (sector_inferido, fecha_firma)
  include (codigo_municipio, valor_contrato);

-- Margen de tiempo para las RPC analíticas (por si el índice no bastara).
alter role authenticated set statement_timeout = '20s';
alter role anon set statement_timeout = '15s';
alter role service_role set statement_timeout = '30s';
notify pgrst, 'reload config';

-- ----------------------------------------------------------------------
-- CORRE ESTA LÍNEA APARTE (selecciónala sola y ejecuta), no puede ir
-- dentro del bloque de arriba:
--
--   vacuum analyze secop_contratos;
-- ----------------------------------------------------------------------
