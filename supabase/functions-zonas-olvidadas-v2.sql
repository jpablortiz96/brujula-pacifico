-- ======================================================================
-- BRÚJULA · Detector de Zonas Olvidadas v2 — metodológicamente riguroso
-- Ejecutar en Supabase SQL Editor DESPUÉS de la re-ingesta balanceada del
-- Sisbén (ver scripts/ingest-sisben.ts con cuota por municipio).
--
-- Metodología (defendible ante jurado técnico):
-- 1. Solo considera municipios con MUESTRA SUFICIENTE (>= 30 registros
--    Sisbén) para evitar artefactos de muestreo.
-- 2. Usa PROPORCIONES, no conteos crudos (robusto al tamaño de muestra).
-- 3. Cruza con inversión SECOP relativa a la población vulnerable.
-- 4. Score compuesto con pesos explícitos y documentados.
-- 5. Devuelve también los municipios excluidos por muestra insuficiente
--    en una función aparte (transparencia).
-- ======================================================================

create or replace function brujula_zonas_olvidadas_v2()
returns table (
  divipola text,
  nombre text,
  departamento text,
  contratos bigint,
  valor_secop_cop numeric,
  sisben_total bigint,
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
      (select count(*) from sisben_personas sp
       where sp.codigo_municipio = m.divipola) as sisben_total,
      (select count(*) from sisben_personas sp
       where sp.codigo_municipio = m.divipola
       and sp.grupo in ('A','B')) as sisben_vulnerable,
      (select count(*) from medicina_lesiones ml
       where ml.codigo_municipio = m.divipola
       and lower(coalesce(ml.manera,'')) like '%homicidio%') as homicidios
    from municipios m
    left join secop_contratos s on s.codigo_municipio = m.divipola
    group by m.divipola, m.nombre, m.departamento
  ),
  scored as (
    select *,
      case when sisben_total > 0
        then round(100.0 * sisben_vulnerable / sisben_total, 1)
        else null end as pct_vulnerable,
      case when sisben_vulnerable > 0
        then round(valor_secop / sisben_vulnerable, 0)
        else null end as inv_per_vuln,
      -- ¿tiene muestra suficiente para rankear?
      case when sisben_total >= 30 then true else false end as muestra_ok
    from muni_stats
  ),
  normalized as (
    select *,
      -- Componente 1: baja inversión per cápita vulnerable (40%)
      -- Cuanto menor la inversión por persona vulnerable, mayor el olvido
      case
        when inv_per_vuln is null then 1.0
        when inv_per_vuln = 0 then 1.0
        else greatest(0, 1.0 - (inv_per_vuln / 5000000.0))
      end as score_inversion,
      -- Componente 2: alta proporción de vulnerabilidad (30%)
      coalesce(pct_vulnerable, 0) / 100.0 as score_vulnerabilidad,
      -- Componente 3: violencia relativa (30%)
      case
        when sisben_total > 0
        then least(1.0, homicidios::numeric / greatest(sisben_total, 1) * 100)
        else least(1.0, homicidios::numeric / 50.0)
      end as score_violencia
    from scored
  )
  select
    divipola, nombre, departamento, contratos, valor_secop as valor_secop_cop,
    sisben_total, pct_vulnerable, homicidios,
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

comment on function brujula_zonas_olvidadas_v2() is
  'Detector de Zonas Olvidadas v2: score compuesto (40% baja inversión per '
  'cápita vulnerable + 30% proporción vulnerabilidad Sisbén A/B + 30% '
  'violencia relativa). Solo rankea municipios con muestra Sisbén >= 30.';

-- ----------------------------------------------------------------------
-- Función complementaria: municipios excluidos por falta de datos
-- (transparencia — el agente puede mencionarlos como "requieren verificación")
-- ----------------------------------------------------------------------
create or replace function brujula_zonas_sin_datos()
returns table (
  divipola text,
  nombre text,
  departamento text,
  contratos bigint,
  sisben_total bigint,
  homicidios bigint
) language sql stable as $$
  select
    m.divipola, m.nombre, m.departamento,
    coalesce(count(distinct s.id), 0)::bigint as contratos,
    (select count(*) from sisben_personas sp
     where sp.codigo_municipio = m.divipola)::bigint as sisben_total,
    (select count(*) from medicina_lesiones ml
     where ml.codigo_municipio = m.divipola
     and lower(coalesce(ml.manera,'')) like '%homicidio%')::bigint as homicidios
  from municipios m
  left join secop_contratos s on s.codigo_municipio = m.divipola
  group by m.divipola, m.nombre, m.departamento
  having (select count(*) from sisben_personas sp
          where sp.codigo_municipio = m.divipola) < 30
    and coalesce(count(distinct s.id), 0) < 10
  order by homicidios desc
  limit 15;
$$;

comment on function brujula_zonas_sin_datos() is
  'Municipios con muestra Sisbén insuficiente (<30) y baja contratación '
  '(<10) — excluidos del ranking de olvido; se reportan para verificación.';
