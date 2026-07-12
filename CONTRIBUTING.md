# Contributing

## Flujo

1. Crear rama descriptiva.
2. No modificar logica, SQL o RPC sin explicar impacto.
3. Ejecutar validaciones.
4. Abrir PR con resumen y evidencia.

## Validaciones

```bash
npm ci
npm run typecheck
npm run lint
npm run build
```

## Datos y secretos

- No subir `.env`.
- No ejecutar ingestas contra produccion sin aprobacion.
- No versionar dumps ni microdatos personales.
- Documentar cambios metodologicos.

## Commits

Usar mensajes descriptivos tipo `docs(...)`, `fix(...)`, `feat(...)` cuando aplique.

