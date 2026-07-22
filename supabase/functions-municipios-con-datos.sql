-- ======================================================================
-- BRUJULA · Lista de municipios con conteo SECOP para los selectores.
-- Ejecutar en Supabase SQL Editor despues de schema.sql.
-- ======================================================================

create or replace function brujula_municipios_con_datos()
returns table (
  divipola text,
  nombre text,
  departamento text,
  contratos bigint
)
language sql
stable
as $$
  select
    m.divipola,
    m.nombre,
    m.departamento,
    coalesce(c.contratos, 0)::bigint as contratos
  from municipios m
  left join (
    select codigo_municipio, count(*)::bigint as contratos
    from secop_contratos
    where codigo_municipio is not null
    group by codigo_municipio
  ) c on c.codigo_municipio = m.divipola
  order by coalesce(c.contratos, 0) desc, m.nombre;
$$;

comment on function brujula_municipios_con_datos() is
  'Municipios catalogados con conteo SECOP en una unica agregacion server-side.';
