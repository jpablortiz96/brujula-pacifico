# Reproducibilidad

## Modos de reproduccion

- Documental: leer README, docs y capturas.
- Demo con base existente: usar produccion Vercel.
- Completa: crear Supabase, aplicar SQL, ejecutar ingestas y validaciones.

## Requisitos

- Node.js 22.x.
- npm.
- Supabase.
- Variables de `.env.example`.

## Instalacion

```bash
npm ci
cp .env.example .env.local
npm run dev
```

## SQL

Aplicar en Supabase, en orden razonable:

```text
supabase/schema.sql
supabase/schema-datasets.sql o schema-datasets-fix.sql segun estado
supabase/alter-*.sql
supabase/functions*.sql
supabase/schema-whatsapp.sql
```

## Seeds e ingestas

No ejecutar contra produccion accidentalmente.

```bash
npm run seed:pacifico
npm run seed:coordenadas
npm run ingest:secop
npm run ingest:all-datasets
npm run enrich:multi
npm run enrich:sisben-poblacion
npm run clasificar:dry
npm run clasificar:sectores
```

## Validaciones y build

```bash
npm run validate
npm run validate:sisben-balance
npm run validate:zonas
npm run typecheck
npm run lint
npm run build
```

## Deployment

Vercel debe usar root del repo, Node 22.x, `npm ci` y `npm run build`. Ver `DEPLOYMENT_VERCEL.md`.

## Limpieza segura

No usar `git clean`, `git reset --hard`, `git gc`, `git prune` ni borrar datos sin respaldo. Para regenerar capturas, sobrescribir solo `docs/assets/readme/screenshots` con el script documentado.

## Costos potenciales

Anthropic puede generar costos en agente y clasificacion. Socrata puede aplicar limites. Puppeteer consume memoria/tiempo en funciones.

