-- ======================================================================
-- BRÚJULA · Limpieza: eliminar los overloads viejos de 1 parámetro.
-- Opcional (el código ya pasa los 3 params para desambiguar), pero deja
-- el esquema limpio y evita el error "Could not choose the best candidate
-- function" si algo llegara a llamar con un solo argumento.
-- ======================================================================

drop function if exists brujula_gasto_por_sector(text);
drop function if exists brujula_cruce_sectorial(text);
