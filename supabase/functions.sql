-- ======================================================================
-- BRÚJULA · Funciones RPC para agregaciones analíticas
-- Ejecutar en Supabase SQL Editor (una sola vez, idempotente)
-- ======================================================================

-- ── KPIs globales filtrados ────────────────────────────────────────────
create or replace function brujula_kpis(
  p_departamento text    default null,
  p_fecha_inicio date    default null,
  p_fecha_fin    date    default null,
  p_valor_min    numeric default null,
  p_valor_max    numeric default null,
  p_busqueda     text    default null
) returns table (
  total_contratos    bigint,
  valor_total_cop    numeric,
  municipios_cubiertos bigint,
  entidades_distintas  bigint,
  fecha_min          date,
  fecha_max          date
) language sql stable as $$
  select
    count(*)::bigint                                                         as total_contratos,
    coalesce(sum(valor_contrato), 0)::numeric                                as valor_total_cop,
    count(distinct codigo_municipio) filter (where codigo_municipio is not null)::bigint as municipios_cubiertos,
    count(distinct nit_entidad)      filter (where nit_entidad      is not null)::bigint as entidades_distintas,
    min(fecha_firma)::date                                                   as fecha_min,
    max(fecha_firma)::date                                                   as fecha_max
  from secop_contratos
  where
    (p_departamento is null or departamento = p_departamento)
    and (p_fecha_inicio is null or fecha_firma >= p_fecha_inicio)
    and (p_fecha_fin    is null or fecha_firma <= p_fecha_fin)
    and (p_valor_min    is null or valor_contrato >= p_valor_min)
    and (p_valor_max    is null or valor_contrato <= p_valor_max)
    and (
      p_busqueda is null or (
        objeto_contrato      ilike '%' || p_busqueda || '%' or
        nombre_entidad       ilike '%' || p_busqueda || '%' or
        proveedor_adjudicado ilike '%' || p_busqueda || '%'
      )
    );
$$;

-- ── Stats por municipio (para el mapa) ───────────────────────────────
create or replace function brujula_municipios_stats(
  p_departamento text    default null,
  p_fecha_inicio date    default null,
  p_fecha_fin    date    default null,
  p_valor_min    numeric default null,
  p_valor_max    numeric default null,
  p_busqueda     text    default null
) returns table (
  divipola     text,
  nombre       text,
  departamento text,
  lat          numeric,
  lng          numeric,
  contratos    bigint,
  valor_total  numeric
) language sql stable as $$
  select
    m.divipola,
    m.nombre,
    m.departamento,
    m.lat,
    m.lng,
    count(s.id)::bigint                        as contratos,
    coalesce(sum(s.valor_contrato), 0)::numeric as valor_total
  from municipios m
  inner join secop_contratos s on s.codigo_municipio = m.divipola
  where
    (p_departamento is null or s.departamento = p_departamento)
    and (p_fecha_inicio is null or s.fecha_firma >= p_fecha_inicio)
    and (p_fecha_fin    is null or s.fecha_firma <= p_fecha_fin)
    and (p_valor_min    is null or s.valor_contrato >= p_valor_min)
    and (p_valor_max    is null or s.valor_contrato <= p_valor_max)
    and (
      p_busqueda is null or (
        s.objeto_contrato      ilike '%' || p_busqueda || '%' or
        s.nombre_entidad       ilike '%' || p_busqueda || '%' or
        s.proveedor_adjudicado ilike '%' || p_busqueda || '%'
      )
    )
  group by m.divipola, m.nombre, m.departamento, m.lat, m.lng
  having count(s.id) > 0
  order by valor_total desc;
$$;

-- ── Índice GIN para búsqueda de texto ────────────────────────────────
create index if not exists idx_secop_busqueda
  on secop_contratos using gin (
    to_tsvector('spanish',
      coalesce(objeto_contrato,      '') || ' ' ||
      coalesce(nombre_entidad,       '') || ' ' ||
      coalesce(proveedor_adjudicado, '')
    )
  );
