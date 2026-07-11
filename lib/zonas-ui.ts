// ─────────────────────────────────────────────────────────────────────────
// BRÚJULA · Helpers de presentación para el Detector de Zonas Olvidadas
// Colores por categoría (brutal-gov) + formateadores de moneda/número.
// ─────────────────────────────────────────────────────────────────────────

export interface CategoriaStyle {
  stroke: string; // borde / color sólido
  fill: string; // relleno translúcido
  solid: string; // color plano para barras/badges
}

const NARANJA = "#EF9F27";

/** Color según la categoría de olvido devuelta por la RPC v3. */
export function categoriaStyle(categoria: string): CategoriaStyle {
  switch (categoria) {
    case "Abandono crítico":
      return { stroke: "rgb(206,17,38)", fill: "rgba(206,17,38,0.60)", solid: "rgb(206,17,38)" };
    case "Alto olvido":
      return { stroke: NARANJA, fill: "rgba(239,159,39,0.60)", solid: NARANJA };
    case "Olvido moderado":
      return { stroke: "rgb(200,160,0)", fill: "rgba(255,205,0,0.60)", solid: "rgb(255,205,0)" };
    default:
      return { stroke: "rgb(20,110,68)", fill: "rgba(26,135,84,0.55)", solid: "rgb(26,135,84)" };
  }
}

// ─── Formateadores ───────────────────────────────────────────────────────
const COP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});
const NUM = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });

/** Moneda COP exacta, sin decimales. */
export function formatCOP(n: number | null | undefined): string {
  if (n == null) return "—";
  return COP.format(Math.round(n));
}

/** Moneda COP compacta: miles de millones (B) / millones (M). */
export function formatCOPCompact(n: number | null | undefined): string {
  if (n == null) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${NUM.format(Math.round(n / 1e8) / 10)} B COP`;
  if (abs >= 1e6) return `$${NUM.format(Math.round(n / 1e5) / 10)} M COP`;
  return COP.format(Math.round(n));
}

/** Número entero con separador de miles. */
export function formatNum(n: number | null | undefined): string {
  if (n == null) return "—";
  return NUM.format(Math.round(n));
}
