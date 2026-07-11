// ─────────────────────────────────────────────────────────────────────────
// BRÚJULA · Traducción de métricas técnicas a lenguaje ciudadano.
// Funciones puras: mismo dato, lenguaje simple y cálido.
// ─────────────────────────────────────────────────────────────────────────

const COP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export function traducirVulnerabilidad(pct: number): string {
  const n = Math.round(pct);
  return `De cada 100 personas, ${n} viven en pobreza o vulnerabilidad económica.`;
}

export function traducirInversion(
  perCapita: number | null,
  contratos: number
): string {
  if (contratos === 0)
    return (
      "El municipio no tiene contratos públicos registrados en el periodo. " +
      "Esto puede señalar baja inversión o que la información no está publicada."
    );
  if (perCapita === null || perCapita === 0)
    return "No hay datos claros de cuánto se invierte por persona.";
  return `Por cada persona vulnerable, el Estado ha contratado alrededor de ${COP.format(
    Math.round(perCapita)
  )} en obras y servicios.`;
}

export function traducirHomicidios(n: number): string {
  if (n === 0)
    return "No se registran muertes violentas en los datos disponibles.";
  return `Se registran ${n} muertes violentas según Medicina Legal. Cada una representa una familia afectada.`;
}

export function traducirCategoria(cat: string): string {
  const map: Record<string, string> = {
    "Abandono crítico":
      "Este municipio está entre los más desatendidos: mucha necesidad, poca inversión pública registrada.",
    "Alto olvido":
      "Este municipio recibe menos atención de la que su situación social requiere.",
    "Olvido moderado":
      "Este municipio tiene brechas de atención que vale la pena vigilar.",
    "Atención normal":
      "Este municipio tiene una relación razonable entre necesidad e inversión.",
  };
  return map[cat] || cat;
}

export function traducirScore(score: number): string {
  const pct = Math.round(score * 100);
  return `Nivel de olvido: ${pct} sobre 100. Entre más alto, más desatendido está el municipio frente a otros del Pacífico.`;
}

// Explica la calidad del dato SECOP en lenguaje ciudadano (v4).
export function traducirCalidadSecop(calidad: string): string | null {
  if (calidad === "posible_subregistro")
    return (
      "Ojo: puede haber inversión que existe pero no aparece asignada a este " +
      "municipio en los datos. Conviene verificar antes de sacar conclusiones."
    );
  if (calidad === "cero_verificado")
    return "La ausencia de contratos está confirmada: aquí sí hay un vacío real de inversión.";
  return null;
}
