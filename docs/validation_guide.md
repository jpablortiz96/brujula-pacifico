# Guia de validacion

## Requisitos

- Node.js 22.x.
- npm.
- Variables segun `.env.example`.
- Supabase seguro si se ejecutan validaciones con datos.

## Pruebas de software

```bash
npm ci
npm run typecheck
npm run lint
npm run build
```

## Validacion de datos

Solo ejecutar si las credenciales apuntan a un entorno seguro:

```bash
npm run validate
npm run validate:sisben-balance
npm run validate:zonas
```

## Validacion metodologica

Revisar:

- score en rango 0-1;
- gate Sisbén `>= 30`;
- `fex` positivo y agregado;
- DIVIPOLA consistente;
- ceros verificados vs posible subregistro;
- porcentajes validos;
- sin `NaN`/`undefined`;
- no presentar asociacion como causalidad.

## Smoke tests de produccion

```bash
curl -I https://brujula-pacifico.vercel.app/
curl https://brujula-pacifico.vercel.app/api/dashboard/kpis
curl https://brujula-pacifico.vercel.app/api/zonas
curl "https://brujula-pacifico.vercel.app/api/sectores?divipola=52835"
```

PDF:

```bash
curl -i "https://brujula-pacifico.vercel.app/api/brief?divipola=76001&tipo=municipio" -o brujula-brief-cali.pdf
```

## Errores comunes

- Falta `SUPABASE_SERVICE_ROLE_KEY`: endpoints server-side fallan.
- Falta `ANTHROPIC_API_KEY`: agente falla en runtime.
- Twilio con URL distinta a Vercel: firma invalida.
- Node distinto a 22.x: advertencias `engines`.

