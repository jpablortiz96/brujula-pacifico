# Scoring

Codigo real:

- `supabase/functions-zonas-olvidadas-v4.sql`
- `lib/queries/zonas.ts`
- `components/brujula/MetodologiaBox.tsx`

Formula:

```text
0.40 baja inversion per capita vulnerable
+ 0.30 vulnerabilidad
+ 0.30 violencia relativa
```

Controles: `fex`, gate Sisbén `>= 30`, `calidad_dato_secop`, normalizacion y lista de municipios que requieren verificacion.

