# Planteamiento del problema

## Contexto territorial

BRUJULA se enfoca en los 178 municipios de Cauca, Choco, Nariño y Valle del Cauca que conforman el alcance territorial del Pacifico colombiano usado por el proyecto.

## Problema de fragmentacion

Los datos publicos existen, pero SECOP, Sisbén, Educacion, Medicina Legal y DIVIPOLA viven en fuentes y vocabularios distintos. Esa separacion dificulta convertir datos abiertos en decisiones verificables.

## Barreras ciudadanas e institucionales

- Ciudadania sin tiempo, conectividad o conocimiento tecnico para consultar APIs.
- Funcionarios que necesitan priorizar con evidencia trazable.
- Periodistas y organizaciones que requieren contrastar cifras sin descargar bases masivas.
- Perdida de memoria institucional cuando las consultas no quedan registradas.

## Usuarios

Ciudadania, liderazgos comunitarios, funcionarios territoriales, analistas, periodistas, organizaciones sociales y jurados del concurso.

## Pregunta principal

¿La inversion publica registrada y geolocalizada esta llegando a los municipios con mayor vulnerabilidad y violencia relativa?

## Objetivos

- Integrar fuentes abiertas por municipio.
- Hacer comprensible la contratacion publica.
- Detectar territorios que requieren revision.
- Permitir consultas con IA sin que la IA invente cifras.
- Dejar trazabilidad mediante bitacora, fuentes y exportaciones.

## Alcance

Aplicacion web, API routes, Supabase, agente, PWA/offline, WhatsApp, PDF, exportaciones y documentacion de evaluacion.

## Fuera de alcance

- Declarar abandono administrativo oficial.
- Inferir causalidad entre inversion e indicadores.
- Entrenar modelos predictivos.
- Publicar microdatos personales.
- Duplicar datasets masivos en Git.

## Criterios de exito

- Demo funcional.
- Fuentes y metodologia auditables.
- Rutas criticas documentadas.
- Build reproducible.
- Secretos fuera del repositorio.

## Supuestos y restricciones

Se asume que los datasets oficiales son la fuente publica disponible. La calidad de georreferenciacion SECOP y la naturaleza de corte de Sisbén/educacion limitan algunas comparaciones temporales.

