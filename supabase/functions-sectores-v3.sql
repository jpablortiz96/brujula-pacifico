-- ======================================================================
-- BRÚJULA · Análisis sectorial v3 — arregla el TIMEOUT del filtro de fecha
-- Ejecutar en Supabase SQL Editor. Reemplaza a v2.
--
-- Causa del bug: con ~190k filas y sin índice compuesto, el filtro
-- (codigo_municipio + fecha_firma) escaneaba toda la tabla y se pasaba del
-- statement_timeout (57014). fecha_firma ES una columna date (la comparación
-- date >= date es correcta; el problema era el índice, no el tipo).
-- Fix: índices compuestos + una sola pasada (pct con window function).
-- ======================================================================

create index if not exists idx_secop_muni_fecha
  on secop_contratos(codigo_municipio, fecha_firma);
create index if not exists idx_secop_sector_fecha
  on secop_contratos(sector_inferido, fecha_firma);

create or replace function brujula_gasto_por_sector(
  p_divipola text,
  p_fecha_inicio date default null,
  p_fecha_fin date default null
)
returns table (sector text, contratos bigint, valor_cop numeric, pct_valor numeric)
language sql stable as $$
  with agregado as (
    select
      coalesce(sector_inferido,'Sin clasificar') as sector,
      count(*)::bigint as contratos,
      coalesce(sum(valor_contrato),0)::numeric as valor_cop
    from secop_contratos
    where codigo_municipio = p_divipola
      and (p_fecha_inicio is null or fecha_firma >= p_fecha_inicio)
      and (p_fecha_fin is null or fecha_firma <= p_fecha_fin)
    group by sector_inferido
  )
  select
    sector, contratos, valor_cop,
    round(100.0 * valor_cop / nullif(sum(valor_cop) over (), 0), 1) as pct_valor
  from agregado
  order by valor_cop desc;
$$;

comment on function brujula_gasto_por_sector(text, date, date) is
  'Desglose sectorial con período (una sola pasada, con índice).';

create or replace function brujula_cruce_sectorial(
  p_sector text,
  p_fecha_inicio date default null,
  p_fecha_fin date default null
)
returns table (
  divipola text, nombre text, departamento text,
  inversion_sector_cop numeric, contratos_sector bigint,
  poblacion_vulnerable numeric, inversion_per_capita numeric,
  indicador_resultado numeric, nombre_indicador text
) language sql stable as $$
  select
    m.divipola, m.nombre, m.departamento,
    coalesce(s.valor,0)::numeric as inversion_sector_cop,
    coalesce(s.n,0)::bigint as contratos_sector,
    coalesce(m.sisben_pob_vulnerable,0)::numeric as poblacion_vulnerable,
    case when coalesce(m.sisben_pob_vulnerable,0) > 0
      then round(coalesce(s.valor,0) / m.sisben_pob_vulnerable, 0)
      else null end as inversion_per_capita,
    case
      when p_sector = 'Educación' then
        (select count(*) from educacion_establecimientos e
         where e.codigo_municipio = m.divipola)::numeric
      when p_sector = 'Seguridad y justicia' then
        (select count(*) from medicina_lesiones l
         where l.codigo_municipio = m.divipola
         and lower(coalesce(l.manera,'')) like '%homicidio%')::numeric
      else null end as indicador_resultado,
    case
      when p_sector = 'Educación' then 'Sedes educativas'
      when p_sector = 'Seguridad y justicia' then 'Homicidios'
      else 'Sin indicador de resultado' end as nombre_indicador
  from municipios m
  left join (
    select codigo_municipio, sum(valor_contrato) as valor, count(*) as n
    from secop_contratos
    where sector_inferido = p_sector
      and (p_fecha_inicio is null or fecha_firma >= p_fecha_inicio)
      and (p_fecha_fin is null or fecha_firma <= p_fecha_fin)
    group by codigo_municipio
  ) s on s.codigo_municipio = m.divipola
  order by inversion_sector_cop desc;
$$;

comment on function brujula_cruce_sectorial(text, date, date) is
  'Cruce sectorial con período (date >= date, con índice).';
