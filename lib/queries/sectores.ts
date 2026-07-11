import { createAdminClient } from "@/lib/supabase/admin";

export interface GastoSector {
  sector: string;
  contratos: number;
  valor_cop: number;
  pct_valor: number;
}

export interface CruceSectorial {
  divipola: string;
  nombre: string;
  departamento: string;
  inversion_sector_cop: number;
  contratos_sector: number;
  poblacion_vulnerable: number;
  inversion_per_capita: number | null;
  indicador_resultado: number | null;
  nombre_indicador: string;
}

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export async function getGastoPorSector(
  divipola: string,
  fechaInicio?: string | null,
  fechaFin?: string | null
): Promise<GastoSector[]> {
  const sb = createAdminClient();
  const { data, error } = await sb.rpc("brujula_gasto_por_sector", {
    p_divipola: divipola,
    p_fecha_inicio: fechaInicio ?? null,
    p_fecha_fin: fechaFin ?? null,
  });
  if (error) throw new Error(error.message);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data as any[]) ?? []).map((r) => ({
    sector: r.sector,
    contratos: num(r.contratos),
    valor_cop: num(r.valor_cop),
    pct_valor: num(r.pct_valor),
  }));
}

export interface RangoFechas {
  min: string | null;
  max: string | null;
  total: number;
}

export async function getRangoFechasMunicipio(divipola: string): Promise<RangoFechas> {
  const sb = createAdminClient();
  const { data, error } = await sb.rpc("brujula_rango_fechas_municipio", { p_divipola: divipola });
  if (error) {
    // Fallback si la RPC no está migrada aún: min/max por orden.
    const [{ data: mn }, { data: mx }, { count }] = await Promise.all([
      sb.from("secop_contratos").select("fecha_firma").eq("codigo_municipio", divipola).not("fecha_firma", "is", null).order("fecha_firma", { ascending: true }).limit(1),
      sb.from("secop_contratos").select("fecha_firma").eq("codigo_municipio", divipola).not("fecha_firma", "is", null).order("fecha_firma", { ascending: false }).limit(1),
      sb.from("secop_contratos").select("*", { count: "exact", head: true }).eq("codigo_municipio", divipola),
    ]);
    return { min: mn?.[0]?.fecha_firma ?? null, max: mx?.[0]?.fecha_firma ?? null, total: count ?? 0 };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = (data as any[])?.[0] ?? {};
  return { min: r.fecha_min ?? null, max: r.fecha_max ?? null, total: num(r.total) };
}

export async function getCruceSectorial(
  sector: string,
  fechaInicio?: string | null,
  fechaFin?: string | null
): Promise<CruceSectorial[]> {
  const sb = createAdminClient();
  const { data, error } = await sb.rpc("brujula_cruce_sectorial", {
    p_sector: sector,
    p_fecha_inicio: fechaInicio ?? null,
    p_fecha_fin: fechaFin ?? null,
  });
  if (error) throw new Error(error.message);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data as any[]) ?? []).map((r) => ({
    divipola: r.divipola,
    nombre: r.nombre,
    departamento: r.departamento,
    inversion_sector_cop: num(r.inversion_sector_cop),
    contratos_sector: num(r.contratos_sector),
    poblacion_vulnerable: num(r.poblacion_vulnerable),
    inversion_per_capita: r.inversion_per_capita != null ? num(r.inversion_per_capita) : null,
    indicador_resultado: r.indicador_resultado != null ? num(r.indicador_resultado) : null,
    nombre_indicador: r.nombre_indicador,
  }));
}
