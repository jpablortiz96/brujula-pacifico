-- ======================================================================
-- BRÚJULA · Conteo de contratos SECOP por municipio (para el comparador)
-- Ejecutar en Supabase SQL Editor. Una sola agregación server-side para
-- que el selector muestre la riqueza de datos sin N consultas.
-- ======================================================================

create or replace function brujula_contratos_por_municipio()
returns table (codigo_municipio text, contratos bigint)
language sql stable as $$
  select codigo_municipio, count(*)::bigint as contratos
  from secop_contratos
  where codigo_municipio is not null
  group by codigo_municipio;
$$;

comment on function brujula_contratos_por_municipio() is
  'Conteo de contratos SECOP geolocalizados por municipio (comparador).';
