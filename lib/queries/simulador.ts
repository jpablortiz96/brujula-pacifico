import { createAdminClient } from "@/lib/supabase/admin";
import { getMunicipiosStats } from "@/lib/queries/dashboard";
import { getIndicadoresMunicipio } from "@/lib/queries/indicadores";

export type PosicionVsPares = "por_debajo" | "por_encima" | "en_promedio";

export interface EscenarioSimulacion {
  municipio: { divipola: string; nombre: string; departamento: string };
  // Estado actual
  inversion_actual_cop: number;
  poblacion_vulnerable: number;
  inversion_per_capita_actual: number;
  // Benchmark de pares
  inversion_per_capita_pares: number; // promedio de municipios similares
  inversion_pares_equivalente_cop: number; // per cápita pares × población
  num_pares: number;
  benchmark_confiable: boolean; // >= 3 pares con datos
  poblacion_valida: boolean; // población vulnerable > 0
  posicion_vs_pares: PosicionVsPares; // dónde está frente al promedio
  ratio_vs_pares: number | null; // per cápita actual / per cápita pares
  // Simulación
  inversion_simulada_cop: number;
  inversion_per_capita_simulada: number;
  // Proyección (con supuestos declarados)
  brecha_cerrada_pct: number; // cuánto de la brecha con pares se cierra (solo si por_debajo)
  supuestos: string[];
}

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

const MIN_PARES_CONFIABLE = 3;

export async function getBenchmarkPares(
  divipola: string
): Promise<{ per_capita_promedio: number; num_pares: number }> {
  const sb = createAdminClient();

  // Departamento del municipio objetivo.
  const { data: muni } = await sb
    .from("municipios")
    .select("departamento")
    .eq("divipola", divipola)
    .single();
  const depto = muni?.departamento;
  if (!depto) return { per_capita_promedio: 0, num_pares: 0 };

  // Pares regionales: municipios del mismo departamento con su contratación
  // (valor + contratos) y su población vulnerable.
  const [stats, munis] = await Promise.all([
    getMunicipiosStats({ departamento: depto }),
    sb
      .from("municipios")
      .select("divipola, sisben_pob_vulnerable")
      .eq("departamento", depto),
  ]);

  const pobMap = new Map<string, number>();
  for (const m of (munis.data as { divipola: string; sisben_pob_vulnerable: number | null }[]) ?? []) {
    if (m.sisben_pob_vulnerable != null) pobMap.set(m.divipola, num(m.sisben_pob_vulnerable));
  }

  const perCapitas: number[] = [];
  for (const r of stats) {
    const d = String(r.divipola);
    if (d === divipola) continue; // excluir el propio municipio
    const contratos = num(r.contratos);
    const valor = num(r.valor_total);
    const pob = pobMap.get(d) ?? 0;
    if (contratos > 0 && pob > 0) perCapitas.push(valor / pob);
  }

  if (perCapitas.length === 0) return { per_capita_promedio: 0, num_pares: 0 };
  const promedio = perCapitas.reduce((s, x) => s + x, 0) / perCapitas.length;
  return { per_capita_promedio: Math.round(promedio), num_pares: perCapitas.length };
}

export async function construirEscenario(
  divipola: string,
  inversionSimuladaCop: number | null
): Promise<EscenarioSimulacion> {
  const sb = createAdminClient();

  const [ind, { data: muni }, benchmark] = await Promise.all([
    getIndicadoresMunicipio(divipola),
    sb
      .from("municipios")
      .select("divipola, nombre, departamento, sisben_pob_vulnerable")
      .eq("divipola", divipola)
      .single(),
    getBenchmarkPares(divipola),
  ]);

  const i = ind;
  const nombre = muni?.nombre ?? divipola;
  const departamento = muni?.departamento ?? "";
  const inversionActual = num(i.valor_contratos);
  const pob = muni?.sisben_pob_vulnerable != null ? num(muni.sisben_pob_vulnerable) : 0;

  const poblacionValida = pob > 0;
  const perCapitaActual = poblacionValida ? Math.round(inversionActual / pob) : 0;
  const perCapitaPares = benchmark.per_capita_promedio;
  const benchmarkConfiable = benchmark.num_pares >= MIN_PARES_CONFIABLE;
  const paresEquivalente = poblacionValida ? Math.round(perCapitaPares * pob) : 0;

  // Default: mantener la inversión ACTUAL (el municipio parte de donde está,
  // no del promedio de pares). Así la vista inicial es coherente.
  const inversionSimulada =
    inversionSimuladaCop != null
      ? Math.max(0, Math.round(inversionSimuladaCop))
      : inversionActual;

  const perCapitaSimulada = poblacionValida
    ? Math.round(inversionSimulada / pob)
    : 0;

  // Posición del municipio frente al promedio de sus pares (±10% = en promedio).
  let posicion: PosicionVsPares = "en_promedio";
  let ratio: number | null = null;
  if (poblacionValida && benchmarkConfiable && perCapitaPares > 0) {
    ratio = Math.round((perCapitaActual / perCapitaPares) * 100) / 100;
    if (perCapitaActual > perCapitaPares * 1.1) posicion = "por_encima";
    else if (perCapitaActual < perCapitaPares * 0.9) posicion = "por_debajo";
    else posicion = "en_promedio";
  }

  // Cierre de brecha SOLO tiene sentido si el municipio está por debajo.
  let brechaCerrada = 0;
  if (poblacionValida && benchmarkConfiable && posicion === "por_debajo") {
    const gap = perCapitaPares - perCapitaActual; // > 0 por definición aquí
    brechaCerrada = clamp(((perCapitaSimulada - perCapitaActual) / gap) * 100, 0, 100);
  }

  // ── Supuestos EXPLÍCITOS (el rigor va aquí) ─────────────────────────────
  const supuestos: string[] = [];
  if (benchmarkConfiable) {
    supuestos.push(
      `Proyección basada en la comparación con ${benchmark.num_pares} municipios pares de ${departamento} que tienen contratación registrada.`
    );
  } else {
    supuestos.push(
      `Datos insuficientes de pares (${benchmark.num_pares}) para un benchmark confiable — interpretar con cautela.`
    );
  }
  if (posicion === "por_encima") {
    supuestos.push(
      "Este municipio ya supera el promedio regional; la simulación explora variaciones sobre una base ya favorable."
    );
  }
  supuestos.push(
    "Asume que la inversión pública se traduce proporcionalmente en cobertura y servicios."
  );
  supuestos.push(
    "No modela corrupción, ejecución parcial, capacidad institucional ni factores externos."
  );
  supuestos.push(
    "Es un escenario de referencia con fines de planeación, NO una predicción garantizada."
  );
  if (!poblacionValida) {
    supuestos.push(
      "El municipio no tiene población vulnerable estimada; no se puede calcular per cápita."
    );
  }

  return {
    municipio: { divipola, nombre, departamento },
    inversion_actual_cop: inversionActual,
    poblacion_vulnerable: pob,
    inversion_per_capita_actual: perCapitaActual,
    inversion_per_capita_pares: perCapitaPares,
    inversion_pares_equivalente_cop: paresEquivalente,
    num_pares: benchmark.num_pares,
    benchmark_confiable: benchmarkConfiable,
    poblacion_valida: poblacionValida,
    posicion_vs_pares: posicion,
    ratio_vs_pares: ratio,
    inversion_simulada_cop: inversionSimulada,
    inversion_per_capita_simulada: perCapitaSimulada,
    brecha_cerrada_pct: Math.round(brechaCerrada),
    supuestos,
  };
}
