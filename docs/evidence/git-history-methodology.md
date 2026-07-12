# Metodologia de reconstruccion del historial Git

## Comandos ejecutados

```bash
git log --all --reflog --reverse --date=iso-strict --pretty=format:"%H|%h|%ad|%an|%s"
git reflog show --all --date=iso-strict
git fsck --full --no-reflogs --unreachable --dangling
```

Tambien se usaron, para inspeccion manual cuando aplica:

```bash
git show --summary --stat --date=iso-strict <SHA>
git diff-tree --no-commit-id --name-status -r <SHA>
```

## Fuentes revisadas

- Commits publicos alcanzables desde `origin/main`.
- Reflog local de `main`.
- Reflog del worktree usado para README.
- Reflog del worktree de evaluacion.
- Busqueda de objetos inalcanzables con `git fsck`.

## Resultado

Se recuperaron cinco commits alcanzables/reflog:

| Commit | Fecha ISO | Mensaje |
|---|---|---|
| `7a94d98` | 2026-07-11T18:46:05-05:00 | BRUJULA: sistema de inteligencia territorial abierta del Pacifico colombiano |
| `fc90fa2` | 2026-07-11T19:08:38-05:00 | Prepare Vercel production deployment |
| `282bd01` | 2026-07-11T19:56:12-05:00 | fix(pdf): stabilize Vercel generation and repair brief pagination |
| `cf78775` | 2026-07-11T20:22:11-05:00 | docs(readme): build enterprise project showcase and visual documentation |
| `6274127` | 2026-07-11T20:26:27-05:00 | docs(readme): mark video demo as not applicable |

`git fsck` no reporto commits dangling/unreachable. No se ejecutaron `gc`, `prune`, `reflog expire`, `reset`, `stash` ni comandos destructivos.

## Agrupacion en versiones

Las versiones del `CHANGELOG.md` agrupan cambios por hitos verificables:

- `0.1.0`: publicacion inicial.
- `0.2.0`: preparacion para Vercel.
- `0.2.1`: correccion PDF.
- `0.3.0`: README y documentacion visual.
- `0.3.1`: ajuste de video no aplicable.
- `0.4.0`: capa documental de evaluacion.

## Limitaciones

- El repositorio publico fue publicado recientemente; no existe historial anterior recuperable en este clon.
- No hay evidencia local de commits inalcanzables adicionales.
- No se publican rutas privadas de maquina, archivos temporales ni correos fuera de los metadatos normales de Git.
- Si hubo trabajo previo antes de inicializar este repositorio, su fecha exacta no recuperable no debe reconstruirse por inferencia.

