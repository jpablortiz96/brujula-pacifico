// ─────────────────────────────────────────────────────────────────────────
// BRÚJULA · Formato de moneda legible según rol.
// ─────────────────────────────────────────────────────────────────────────

const COP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});
const NUM = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });

type Rol = "funcionario" | "ciudadano";

/**
 * Moneda legible. Funcionario: Intl es-CO completo. Ciudadano: redondeado a
 * billones / millones para que sea entendible ("$2.590 millones").
 */
export function formatearMonedaLegible(
  valor: number | null | undefined,
  rol: Rol
): string {
  if (valor == null) return "—";
  if (rol === "funcionario") return COP.format(Math.round(valor));

  const abs = Math.abs(valor);
  if (abs >= 1e12) {
    return `$${(valor / 1e12).toFixed(1).replace(".", ",")} billones`;
  }
  if (abs >= 1e6) {
    return `$${NUM.format(Math.round(valor / 1e6))} millones`;
  }
  return COP.format(Math.round(valor));
}
