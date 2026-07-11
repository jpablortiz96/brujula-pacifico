import { createAdminClient } from "@/lib/supabase/admin";

export interface LandingStats {
  municipios: number;
  contratos: number;
  contratos_geo_pct: number;
  valor_total_cop: number;
  municipios_cubiertos: number;
  entidades: number;
  fecha_max: string | null;
  sisben: number;
  educacion: number;
  medicina: number;
  por_departamento: { nombre: string; municipios: number }[];
}

// Valores de respaldo (por si Supabase no responde en build): coinciden con
// la última corrida de scripts/stats-proyecto.ts.
const FALLBACK: LandingStats = {
  municipios: 178,
  contratos: 189892,
  contratos_geo_pct: 90.7,
  valor_total_cop: 19_094_056_000_372,
  municipios_cubiertos: 124,
  entidades: 471,
  fecha_max: "2026-07-09",
  sisben: 70400,
  educacion: 7325,
  medicina: 8281,
  por_departamento: [
    { nombre: "Cauca", municipios: 42 },
    { nombre: "Chocó", municipios: 30 },
    { nombre: "Nariño", municipios: 64 },
    { nombre: "Valle del Cauca", municipios: 42 },
  ],
};

const DEPTOS: [string, string][] = [
  ["19", "Cauca"],
  ["27", "Chocó"],
  ["52", "Nariño"],
  ["76", "Valle del Cauca"],
];

export async function getLandingStats(): Promise<LandingStats> {
  try {
    const sb = createAdminClient();
    const head = (t: string) => sb.from(t).select("*", { count: "exact", head: true });

    const [
      muni,
      secop,
      secopGeo,
      sisben,
      educacion,
      medicina,
      kpiRes,
      maxRes,
      ...deptoCounts
    ] = await Promise.all([
      head("municipios"),
      head("secop_contratos"),
      sb.from("secop_contratos").select("*", { count: "exact", head: true }).not("codigo_municipio", "is", null),
      head("sisben_personas"),
      head("educacion_establecimientos"),
      head("medicina_lesiones"),
      sb.rpc("brujula_kpis", { p_departamento: null, p_fecha_inicio: null, p_fecha_fin: null, p_valor_min: null, p_valor_max: null, p_busqueda: null }),
      sb.from("secop_contratos").select("fecha_firma").not("fecha_firma", "is", null).order("fecha_firma", { ascending: false }).limit(1),
      ...DEPTOS.map(([pref]) =>
        sb.from("municipios").select("*", { count: "exact", head: true }).like("divipola", `${pref}%`)
      ),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const k = ((kpiRes.data as any[]) ?? [])[0] ?? {};
    const contratos = secop.count ?? 0;
    const geo = secopGeo.count ?? 0;

    return {
      municipios: muni.count ?? FALLBACK.municipios,
      contratos: contratos || FALLBACK.contratos,
      contratos_geo_pct: contratos ? Math.round((1000 * geo) / contratos) / 10 : FALLBACK.contratos_geo_pct,
      valor_total_cop: Number(k.valor_total_cop ?? FALLBACK.valor_total_cop),
      municipios_cubiertos: Number(k.municipios_cubiertos ?? FALLBACK.municipios_cubiertos),
      entidades: Number(k.entidades_distintas ?? FALLBACK.entidades),
      fecha_max: maxRes.data?.[0]?.fecha_firma ?? FALLBACK.fecha_max,
      sisben: sisben.count ?? FALLBACK.sisben,
      educacion: educacion.count ?? FALLBACK.educacion,
      medicina: medicina.count ?? FALLBACK.medicina,
      por_departamento: DEPTOS.map(([, nombre], i) => ({ nombre, municipios: deptoCounts[i]?.count ?? 0 })),
    };
  } catch {
    return FALLBACK;
  }
}
