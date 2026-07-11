-- ======================================================================
-- BRÚJULA · Rango de fechas de contratación de un municipio
-- Para explicar en el empty state por qué un período no tiene datos.
-- ======================================================================

create or replace function brujula_rango_fechas_municipio(p_divipola text)
returns table (fecha_min text, fecha_max text, total bigint)
language sql stable as $$
  select
    min(fecha_firma) as fecha_min,
    max(fecha_firma) as fecha_max,
    count(*)::bigint as total
  from secop_contratos
  where codigo_municipio = p_divipola
    and fecha_firma is not null;
$$;

comment on function brujula_rango_fechas_municipio(text) is
  'Rango (min, max) de fecha_firma y total de contratos de un municipio.';
