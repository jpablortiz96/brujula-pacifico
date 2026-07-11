-- ======================================================================
-- BRÚJULA · Análisis sectorial de la contratación SECOP
-- Ejecutar en Supabase SQL Editor DESPUÉS de clasificar-sectores.ts.
-- ======================================================================

-- Desglose de inversión por sector en un municipio.
create or replace function brujula_gasto_por_sector(p_divipola text)
returns table (sector text, contratos bigint, valor_cop numeric, pct_valor numeric)
language sql stable as $$
  with total as (
    select coalesce(sum(valor_contrato),0) as t
    from secop_contratos where codigo_municipio = p_divipola
  )
  select
    coalesce(sector_inferido,'Sin clasificar') as sector,
    count(*)::bigint as contratos,
    coalesce(sum(valor_contrato),0)::numeric as valor_cop,
    case when (select t from total) > 0
      then round(100.0 * coalesce(sum(valor_contrato),0) / (select t from total), 1)
      else 0 end as pct_valor
  from secop_contratos
  where codigo_municipio = p_divipola
  group by sector_inferido
  order by valor_cop desc;
$$;

comment on function brujula_gasto_por_sector(text) is
  'Desglose de inversión SECOP por sector inferido en un municipio.';

-- Cruce sectorial: inversión de un sector vs indicador de resultado.
create or replace function brujula_cruce_sectorial(p_sector text)
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
    from secop_contratos where sector_inferido = p_sector
    group by codigo_municipio
  ) s on s.codigo_municipio = m.divipola
  order by inversion_sector_cop desc;
$$;

comment on function brujula_cruce_sectorial(text) is
  'Cruce de inversión sectorial con indicador de resultado por municipio.';
