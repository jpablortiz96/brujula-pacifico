-- ======================================================================
-- BRÚJULA · Detector de Zonas Olvidadas v3 — per cápita REAL con fex DANE
-- Ejecutar en Supabase SQL Editor DESPUÉS de:
--   1. supabase/alter-municipios-sisben-poblacion.sql
--   2. scripts/enrich-sisben-poblacion.ts (pobla municipios.sisben_pob_*)
--
-- Metodología (defendible ante jurado técnico):
--   Score de olvido (0-1) = 0.40 * baja inversión per cápita vulnerable
--                         + 0.30 * proporción de vulnerabilidad (ponderada)
--                         + 0.30 * violencia relativa
--
--   - POBLACIÓN VULNERABLE REAL: se usa la población EXPANDIDA con el factor
--     de expansión estadístico (fex) del DANE, calculada sobre el dataset
--     COMPLETO (municipios.sisben_pob_vulnerable), NO sobre la muestra capada
--     de sisben_personas. Esto corrige el sesgo de 5-20× del conteo de muestra.
--   - inversion_per_vulnerable = valor_secop / población vulnerable expandida
--     → pesos COP por persona vulnerable estimada (per cápita real).
--   - pct_vulnerable = 100 * pob_vulnerable / pob_total (proporción ponderada
--     por expansión, sobre universo completo).
--   - Solo rankea municipios con MUESTRA suficiente (>=30 registros Sisbén),
--     para no rankear artefactos de muestreo.
--   - Umbral de inversión: <$500.000 COP/persona vulnerable → olvido alto.
-- ======================================================================

create or replace function brujula_zonas_olvidadas_v3()
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
  confianza text
) language sql stable as $$
  with muni_stats as (
    select
      m.divipola,
      m.nombre,
      m.departamento,
      coalesce(count(distinct s.id), 0) as contratos,
      coalesce(sum(s.valor_contrato), 0) as valor_secop,
      -- Población expandida autoritativa (fex sobre dataset completo)
      coalesce(m.sisben_pob_total, 0) as pob_total,
      coalesce(m.sisben_pob_vulnerable, 0) as pob_vulnerable,
      -- Muestra local (tabla capada) solo para el gate de confianza
      (select count(*) from sisben_personas sp
       where sp.codigo_municipio = m.divipola) as sisben_muestra,
      (select count(*) from medicina_lesiones ml
       where ml.codigo_municipio = m.divipola
       and lower(coalesce(ml.manera,'')) like '%homicidio%') as homicidios
    from municipios m
    left join secop_contratos s on s.codigo_municipio = m.divipola
    group by m.divipola, m.nombre, m.departamento,
             m.sisben_pob_total, m.sisben_pob_vulnerable
  ),
  scored as (
    select *,
      case when pob_total > 0
        then round(100.0 * pob_vulnerable / pob_total, 1)
        else null end as pct_vulnerable,
      -- per cápita REAL: COP por persona vulnerable expandida
      case when pob_vulnerable > 0
        then round(valor_secop / pob_vulnerable, 0)
        else null end as inv_per_vuln,
      -- gate de muestra suficiente para rankear
      case when sisben_muestra >= 30 then true else false end as muestra_ok
    from muni_stats
  ),
  normalized as (
    select *,
      -- Componente 1 (40%): baja inversión per cápita vulnerable.
      -- Umbral: <$500.000 COP/persona vulnerable → olvido máximo.
      case
        when inv_per_vuln is null then 1.0
        when inv_per_vuln = 0 then 1.0
        else greatest(0, 1.0 - (inv_per_vuln / 500000.0))
      end as score_inversion,
      -- Componente 2 (30%): proporción de vulnerabilidad (ponderada por fex)
      coalesce(pct_vulnerable, 0) / 100.0 as score_vulnerabilidad,
      -- Componente 3 (30%): violencia — homicidios absolutos normalizados
      -- (50+ homicidios = máximo). Estable respecto al tamaño de muestra.
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
    case when muestra_ok then 'Alta' else 'Baja (muestra insuficiente)' end as confianza
  from normalized
  where muestra_ok = true  -- SOLO municipios con datos suficientes
  order by score_olvido desc
  limit 20;
$$;

comment on function brujula_zonas_olvidadas_v3() is
  'Detector de Zonas Olvidadas v3: per cápita real con factor de expansión '
  'fex del DANE (población vulnerable expandida sobre dataset completo). '
  'Score = 40% baja inversión per cápita + 30% proporción vulnerabilidad '
  'ponderada + 30% violencia. Solo rankea municipios con muestra Sisbén >=30.';
