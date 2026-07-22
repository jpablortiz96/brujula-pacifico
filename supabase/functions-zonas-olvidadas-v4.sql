-- ======================================================================
-- BRÚJULA · Detector de Zonas Olvidadas v4
-- = v3 (per cápita real con fex) + señal de CALIDAD DE DATO SECOP.
--
-- Ejecutar en Supabase SQL Editor DESPUÉS de v3 y de re-correr la ingesta
-- de población (municipios.sisben_pob_*).  Idealmente también tras
-- `npm run enrich:divipola` para recuperar contratos geolocalizables.
--
-- Motivación: un municipio con 0 contratos puede ser (a) abandono real o
-- (b) subregistro — contratos existentes en el departamento pero SIN
-- geolocalizar (ciudad "No Definido"). Distinguirlos evita acusar de
-- abandono a municipios cuya inversión simplemente no está asignada.
--
-- calidad_dato_secop:
--   'ok'                   → el municipio tiene contratos geolocalizados.
--   'posible_subregistro'  → 0 contratos Y su departamento tiene una bolsa
--                            grande de contratos sin geolocalizar
--                            (>= 15% del total departamental).
--   'cero_verificado'      → 0 contratos Y el departamento está bien
--                            geolocalizado (bolsa < 15%). Abandono real.
-- El umbral 0.15 es una constante documentada y ajustable.
-- ======================================================================

create or replace function brujula_zonas_olvidadas_v4()
returns table (
  divipola text,
  nombre text,
  departamento text,
  contratos bigint,
  valor_secop_cop numeric,
  sisben_muestra bigint,
  poblacion_vulnerable_estimada numeric,
  pct_vulnerable numeric,
  homicidios bigint,
  inversion_per_vulnerable numeric,
  score_olvido numeric,
  categoria text,
  confianza text,
  calidad_dato_secop text
) language sql stable as $$
  with depto_secop as (
    -- Bolsa de no-geolocalizados por departamento (nombre tal como aparece
    -- en secop_contratos, que coincide con municipios.departamento).
    select
      departamento,
      count(*)::numeric as total_depto,
      count(*) filter (where codigo_municipio is null)::numeric as sin_geo_depto
    from secop_contratos
    group by departamento
  ),
  secop_agg as (
    select
      codigo_municipio,
      count(*)::bigint as contratos,
      coalesce(sum(valor_contrato), 0)::numeric as valor_secop
    from secop_contratos
    group by codigo_municipio
  ),
  sisben_agg as (
    select
      codigo_municipio,
      count(*)::bigint as sisben_muestra
    from sisben_personas
    group by codigo_municipio
  ),
  homicidios_agg as (
    select
      codigo_municipio,
      count(*)::bigint as homicidios
    from medicina_lesiones
    where lower(coalesce(manera, '')) like '%homicidio%'
    group by codigo_municipio
  ),
  muni_stats as (
    select
      m.divipola,
      m.nombre,
      m.departamento,
      coalesce(s.contratos, 0)::bigint as contratos,
      coalesce(s.valor_secop, 0)::numeric as valor_secop,
      coalesce(m.sisben_pob_total, 0) as pob_total,
      coalesce(m.sisben_pob_vulnerable, 0) as pob_vulnerable,
      coalesce(sb.sisben_muestra, 0)::bigint as sisben_muestra,
      coalesce(h.homicidios, 0)::bigint as homicidios,
      -- fracción de contratos del depto sin geolocalizar
      case
        when coalesce(ds.total_depto, 0) > 0
        then ds.sin_geo_depto / ds.total_depto
        else 0
      end as pct_sin_geo_depto
    from municipios m
    left join secop_agg s on s.codigo_municipio = m.divipola
    left join sisben_agg sb on sb.codigo_municipio = m.divipola
    left join homicidios_agg h on h.codigo_municipio = m.divipola
    left join depto_secop ds on ds.departamento = m.departamento
  ),
  scored as (
    select *,
      case when pob_total > 0
        then round(100.0 * pob_vulnerable / pob_total, 1)
        else null end as pct_vulnerable,
      case when pob_vulnerable > 0
        then round(valor_secop / pob_vulnerable, 0)
        else null end as inv_per_vuln,
      case when sisben_muestra >= 30 then true else false end as muestra_ok
    from muni_stats
  ),
  normalized as (
    select *,
      case
        when inv_per_vuln is null then 1.0
        when inv_per_vuln = 0 then 1.0
        else greatest(0, 1.0 - (inv_per_vuln / 500000.0))
      end as score_inversion,
      coalesce(pct_vulnerable, 0) / 100.0 as score_vulnerabilidad,
      least(1.0, homicidios::numeric / 50.0) as score_violencia
    from scored
  )
  select
    divipola, nombre, departamento, contratos,
    valor_secop as valor_secop_cop,
    sisben_muestra::bigint,
    round(pob_vulnerable, 0) as poblacion_vulnerable_estimada,
    pct_vulnerable, homicidios,
    inv_per_vuln as inversion_per_vulnerable,
    round((
      0.40 * score_inversion +
      0.30 * score_vulnerabilidad +
      0.30 * score_violencia
    )::numeric, 3) as score_olvido,
    case
      when contratos = 0 and pct_vulnerable > 70 then 'Abandono crítico'
      when contratos < 10 and pct_vulnerable > 50 then 'Alto olvido'
      when contratos < 30 then 'Olvido moderado'
      else 'Atención normal'
    end as categoria,
    case when muestra_ok then 'Alta' else 'Baja (muestra insuficiente)' end as confianza,
    case
      when contratos > 0 then 'ok'
      when pct_sin_geo_depto >= 0.15 then 'posible_subregistro'
      else 'cero_verificado'
    end as calidad_dato_secop
  from normalized
  where muestra_ok = true
  order by score_olvido desc
  limit 20;
$$;

comment on function brujula_zonas_olvidadas_v4() is
  'Zonas olvidadas v4: v3 (per cápita fex) + calidad_dato_secop que '
  'distingue cero_verificado (abandono real) de posible_subregistro '
  '(contratos del depto sin geolocalizar, bolsa >=15% del total).';
