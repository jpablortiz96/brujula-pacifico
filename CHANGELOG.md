# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y versionado semantico. El historial se reconstruyo exclusivamente desde `git log --all --reflog`, `git reflog show --all` y commits publicos disponibles.

## Historial verificable

## [0.4.0] - 2026-07-11

### Documentation

- Agrega capa de evaluacion para jurados, mapeo de estructura del concurso, matriz de evidencias, guias de reproducibilidad, data/model/test/report docs y gobernanza.
- Commit local/publico: pendiente hasta merge de esta rama.

## [0.3.1] - 2026-07-11

### Documentation

- Marca el video demo como no aplicable y conserva la demo en produccion + capturas reproducibles como evidencia visual.
- Commit: `6274127`.

## [0.3.0] - 2026-07-11

### Documentation

- Reconstruye README empresarial con hero SVG, capturas reales, diagramas Mermaid, product tour, arquitectura, metodologia, stack, rutas y limitaciones.
- Agrega `docs/assets/readme/` y `scripts/capture-readme-screenshots.ts`.
- Commit: `cf78775`.

## [0.2.1] - 2026-07-11

### Fixed

- Estabiliza generacion PDF en Vercel con Puppeteer/Chromium, runtime Node.js, trazas y reparacion de paginacion del brief.
- Commit: `282bd01`.

## [0.2.0] - 2026-07-11

### Changed

- Prepara despliegue de produccion en Vercel.
- Ajusta configuracion de runtime, variables, Node 22.x y documentacion de deployment.
- Commit: `fc90fa2`.

## [0.1.0] - 2026-07-11

### Added

- Publica version inicial de BRUJULA como sistema de inteligencia territorial abierta del Pacifico colombiano.
- Incluye aplicacion Next.js, Supabase, agente, scripts de datos, SQL, PWA, WhatsApp, exportaciones y documentacion base.
- Commit inicial: `7a94d98`.

## Hitos reconstruidos

No se encontraron objetos inalcanzables con `git fsck --full --no-reflogs --unreachable --dangling`. Por tanto no hay commits locales adicionales recuperables mas alla de log/reflog. Si existieron iteraciones previas fuera de este repositorio publicado, su fecha exacta no recuperable no debe inferirse desde archivos.

