-- Ejecutar despues de functions-zonas-olvidadas-v4.sql.
-- El resultado debe estar vacio: cada fila indicaria una diferencia entre la
-- implementacion anterior y la version agregada por CTEs.

with depto_secop as (
  select
    departamento,
    count(*)::numeric as total_depto,
    count(*) filter (where codigo_municipio is null)::numeric as sin_geo_depto
  from secop_contratos
  group by departamento
),
legacy_muni_stats as (
  select
    m.divipola,
    m.nombre,
    m.departamento,
    coalesce(count(distinct s.id), 0) as contratos,
    coalesce(sum(s.valor_contrato), 0) as valor_secop,
    coalesce(m.sisben_pob_total, 0) as pob_total,
    coalesce(m.sisben_pob_vulnerable, 0) as pob_vulnerable,
    (select count(*) from sisben_personas sp where sp.codigo_municipio = m.divipola) as sisben_muestra,
    (
      select count(*)
      from medicina_lesiones ml
      where ml.codigo_municipio = m.divipola
        and lower(coalesce(ml.manera, '')) like '%homicidio%'
    ) as homicidios,
    case
      when coalesce(ds.total_depto, 0) > 0 then ds.sin_geo_depto / ds.total_depto
      else 0
    end as pct_sin_geo_depto
  from municipios m
  left join secop_contratos s on s.codigo_municipio = m.divipola
  left join depto_secop ds on ds.departamento = m.departamento
  group by
    m.divipola, m.nombre, m.departamento, m.sisben_pob_total,
    m.sisben_pob_vulnerable, ds.total_depto, ds.sin_geo_depto
),
legacy_scored as (
  select
    *,
    case when pob_total > 0 then round(100.0 * pob_vulnerable / pob_total, 1) else null end as pct_vulnerable,
    case when pob_vulnerable > 0 then round(valor_secop / pob_vulnerable, 0) else null end as inv_per_vuln,
    case when sisben_muestra >= 30 then true else false end as muestra_ok
  from legacy_muni_stats
),
legacy_normalized as (
  select
    *,
    case
      when inv_per_vuln is null then 1.0
      when inv_per_vuln = 0 then 1.0
      else greatest(0, 1.0 - (inv_per_vuln / 500000.0))
    end as score_inversion,
    coalesce(pct_vulnerable, 0) / 100.0 as score_vulnerabilidad,
    least(1.0, homicidios::numeric / 50.0) as score_violencia
  from legacy_scored
),
legacy as (
  select
    divipola,
    nombre,
    departamento,
    contratos,
    valor_secop as valor_secop_cop,
    sisben_muestra::bigint,
    round(pob_vulnerable, 0) as poblacion_vulnerable_estimada,
    pct_vulnerable,
    homicidios,
    inv_per_vuln as inversion_per_vulnerable,
    round((0.40 * score_inversion + 0.30 * score_vulnerabilidad + 0.30 * score_violencia)::numeric, 3) as score_olvido,
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
  from legacy_normalized
  where muestra_ok = true
  order by score_olvido desc
  limit 20
),
legacy_ranked as (
  select *, row_number() over (order by score_olvido desc) as posicion
  from legacy
),
optimized_ranked as (
  select *, row_number() over (order by score_olvido desc) as posicion
  from brujula_zonas_olvidadas_v4()
)
select
  coalesce(l.posicion, o.posicion) as posicion,
  l.divipola as divipola_anterior,
  o.divipola as divipola_optimizada,
  l.score_olvido as score_anterior,
  o.score_olvido as score_optimizado
from legacy_ranked l
full outer join optimized_ranked o on o.posicion = l.posicion
where row(
  l.divipola, l.nombre, l.departamento, l.contratos, l.valor_secop_cop,
  l.sisben_muestra, l.poblacion_vulnerable_estimada, l.pct_vulnerable,
  l.homicidios, l.inversion_per_vulnerable, l.score_olvido, l.categoria,
  l.confianza, l.calidad_dato_secop
) is distinct from row(
  o.divipola, o.nombre, o.departamento, o.contratos, o.valor_secop_cop,
  o.sisben_muestra, o.poblacion_vulnerable_estimada, o.pct_vulnerable,
  o.homicidios, o.inversion_per_vulnerable, o.score_olvido, o.categoria,
  o.confianza, o.calidad_dato_secop
)
order by posicion;
