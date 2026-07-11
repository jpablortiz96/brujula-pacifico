-- ======================================================================
-- BRÚJULA · Funciones cruzadas entre datasets
-- Ejecutar en Supabase SQL Editor DESPUÉS de functions.sql y schema-datasets.sql
-- ======================================================================

-- ──────────────────────────────────────────────────────────────────────
-- 1. Indicadores por municipio (DIVIPOLA 5 dígitos)
--    Combina: secop_contratos, educacion_establecimientos,
--             sisben_personas, medicina_lesiones
-- ──────────────────────────────────────────────────────────────────────
create or replace function brujula_indicadores_municipio(p_divipola text)
returns jsonb
language sql stable
as $$
  select jsonb_build_object(
    'divipola',          p_divipola,

    -- SECOP II
    'contratos',         (
      select count(*)::bigint
      from secop_contratos
      where codigo_municipio = p_divipola
    ),
    'valor_contratos',   (
      select coalesce(sum(valor_contrato), 0)::numeric
      from secop_contratos
      where codigo_municipio = p_divipola
    ),

    -- Educación MEN
    'estab_total',       (
      select count(*)::bigint
      from educacion_establecimientos
      where codigo_municipio = p_divipola
    ),
    'estab_oficial',     (
      select count(*)::bigint
      from educacion_establecimientos
      where codigo_municipio = p_divipola
        and sector = 'OFICIAL'
    ),
    'matricula_total',   (
      select coalesce(sum(total_matricula), 0)::bigint
      from educacion_establecimientos
      where codigo_municipio = p_divipola
    ),

    -- Sisbén IV
    'sisben_registros',  (
      select count(*)::bigint
      from sisben_personas
      where codigo_municipio = p_divipola
    ),
    'sisben_vulnerables', (
      select count(*)::bigint
      from sisben_personas
      where codigo_municipio = p_divipola
        and grupo in ('A', 'B')
    ),

    -- Medicina Legal
    'muertes_total',     (
      select count(*)::bigint
      from medicina_lesiones
      where codigo_municipio = p_divipola
    ),
    'homicidios',        (
      select count(*)::bigint
      from medicina_lesiones
      where codigo_municipio = p_divipola
        and manera ilike '%homicidio%'
    )
  )
$$;

comment on function brujula_indicadores_municipio(text) is
  'Indicadores cruzados por municipio DIVIPOLA: SECOP, educación, Sisbén, Medicina Legal';

-- ──────────────────────────────────────────────────────────────────────
-- 2. Zonas olvidadas
--    Municipios con presencia de población (Sisbén o edu) pero poca
--    inversión pública (pocos contratos SECOP), ordenados por
--    vulnerabilidad descendente.
-- ──────────────────────────────────────────────────────────────────────
create or replace function brujula_zonas_olvidadas()
returns table (
  divipola          text,
  nombre            text,
  departamento      text,
  contratos         bigint,
  valor_contratos   numeric,
  sisben_registros  bigint,
  pct_vulnerables   numeric,
  estab_educativos  bigint,
  muertes           bigint
)
language sql stable
as $$
  select
    m.divipola,
    m.nombre,
    m.departamento,
    coalesce(sec.contratos,      0)::bigint  as contratos,
    coalesce(sec.valor_total,    0)::numeric as valor_contratos,
    coalesce(sis.registros,      0)::bigint  as sisben_registros,
    case
      when coalesce(sis.registros, 0) > 0
      then round(
        coalesce(sis.vulnerables, 0)::numeric
        / sis.registros::numeric * 100, 1
      )
      else 0::numeric
    end                                      as pct_vulnerables,
    coalesce(edu.establecimientos, 0)::bigint as estab_educativos,
    coalesce(med.muertes,          0)::bigint as muertes

  from municipios m

  left join (
    select codigo_municipio,
           count(*)           as contratos,
           sum(valor_contrato) as valor_total
    from secop_contratos
    group by codigo_municipio
  ) sec on sec.codigo_municipio = m.divipola

  left join (
    select codigo_municipio,
           count(*)                                              as registros,
           sum(case when grupo in ('A','B') then 1 else 0 end)  as vulnerables
    from sisben_personas
    group by codigo_municipio
  ) sis on sis.codigo_municipio = m.divipola

  left join (
    select codigo_municipio, count(*) as establecimientos
    from educacion_establecimientos
    group by codigo_municipio
  ) edu on edu.codigo_municipio = m.divipola

  left join (
    select codigo_municipio, count(*) as muertes
    from medicina_lesiones
    group by codigo_municipio
  ) med on med.codigo_municipio = m.divipola

  -- Solo municipios con datos de población
  where coalesce(sis.registros, 0) > 0
     or coalesce(edu.establecimientos, 0) > 0

  -- Menos inversión primero; desempate: más vulnerables primero
  order by
    coalesce(sec.contratos, 0) asc,
    coalesce(sis.registros,  0) desc

  limit 50
$$;

comment on function brujula_zonas_olvidadas() is
  'Top 50 municipios del Pacífico con presencia poblacional pero poca inversión pública SECOP';
