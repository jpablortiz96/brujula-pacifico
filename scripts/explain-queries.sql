-- Ejecutar en Supabase SQL Editor para inspeccionar planes y tiempos reales.
-- No modifica datos ni esquema. Comparar antes y despues de aplicar
-- indices-performance.sql y las funciones optimizadas.

explain (analyze, buffers, verbose)
select * from brujula_kpis();

explain (analyze, buffers, verbose)
select * from brujula_municipios_stats();

explain (analyze, buffers, verbose)
select * from brujula_municipios_con_datos();

explain (analyze, buffers, verbose)
select * from brujula_zonas_olvidadas_v4();

-- La RPC por municipio ya era rapida; se conserva como control.
explain (analyze, buffers, verbose)
select brujula_indicadores_municipio('19001');
