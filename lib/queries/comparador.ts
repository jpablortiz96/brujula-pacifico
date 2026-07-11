import { createAdminClient } from "@/lib/supabase/admin";

export type CalidadSecop = "ok" | "posible_subregistro" | "cero_verificado";

export interface MunicipioComparable {
  divipola: string;
  nombre: string;
  departamento: string;
  poblacion_vulnerable: number | null;
  contratos: number;
  valor_secop_cop: number;
  estab_total: number;
  sisben_vulnerables: number;
  pct_vulnerable: number | null;
  homicidios: number;
  inversion_per_vulnerable: number | null;
  calidad_dato_secop: CalidadSecop;
}

export interface MunicipioLista {
  divipola: string;
  nombre: string;
  departamento: string;
  contratos: number;
  tiene_datos_ricos: boolean; // contratos > 20
}

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Umbral relativo de subregistro departamental (igual que la RPC v4).
const UMBRAL_SUBREGISTRO = 0.15;
const UMBRAL_DATOS_RICOS = 20;

// ─── Conteo de contratos por municipio (RPC agregada + fallback) ─────────
async function conteoContratosPorMunicipio(
  sb: ReturnType<typeof createAdminClient>
): Promise<Map<string, number>> {
  const mapa = new Map<string, number>();

  // Camino óptimo: una sola agregación server-side.
  const { data, error } = await sb.rpc("brujula_contratos_por_municipio");
  if (!error && Array.isArray(data)) {
    for (const r of data as { codigo_municipio: string; contratos: number }[]) {
      if (r.codigo_municipio) mapa.set(r.codigo_municipio, num(r.contratos));
    }
    return mapa;
  }

  // Fallback (si la RPC aún no está migrada): cuenta paginando la columna.
  const PAGE = 1000;
  let from = 0;
  for (let i = 0; i < 60; i++) {
    const { data: rows, error: err } = await sb
      .from("secop_contratos")
      .select("codigo_municipio")
      .not("codigo_municipio", "is", null)
      .range(from, from + PAGE - 1);
    if (err || !rows || rows.length === 0) break;
    for (const r of rows) {
      const c = (r as { codigo_municipio: string }).codigo_municipio;
      if (c) mapa.set(c, (mapa.get(c) ?? 0) + 1);
    }
    if (rows.length < PAGE) break;
    from += PAGE;
  }
  return mapa;
}

export async function listarMunicipiosConDatos(): Promise<MunicipioLista[]> {
  const sb = createAdminClient();
  const [{ data: munis }, conteo] = await Promise.all([
    sb.from("municipios").select("divipola, nombre, departamento"),
    conteoContratosPorMunicipio(sb),
  ]);

  const lista: MunicipioLista[] = (
    (munis as { divipola: string; nombre: string; departamento: string }[]) || []
  ).map((m) => {
    const contratos = conteo.get(m.divipola) ?? 0;
    return {
      divipola: m.divipola,
      nombre: m.nombre,
      departamento: m.departamento,
      contratos,
      tiene_datos_ricos: contratos > UMBRAL_DATOS_RICOS,
    };
  });

  // Ordena: primero datos ricos (por contratos desc), luego alfabético.
  lista.sort((a, b) => {
    if (a.tiene_datos_ricos !== b.tiene_datos_ricos)
      return a.tiene_datos_ricos ? -1 : 1;
    if (a.tiene_datos_ricos) return b.contratos - a.contratos;
    return a.nombre.localeCompare(b.nombre, "es");
  });
  return lista;
}

// ─── Calidad del dato SECOP (misma lógica que v4) ────────────────────────
async function calidadSecop(
  sb: ReturnType<typeof createAdminClient>,
  departamento: string,
  contratos: number
): Promise<CalidadSecop> {
  if (contratos > 0) return "ok";
  // Bolsa departamental sin geolocalizar / total del departamento.
  const [{ count: total }, { count: sinGeo }] = await Promise.all([
    sb.from("secop_contratos").select("*", { count: "exact", head: true }).eq("departamento", departamento),
    sb
      .from("secop_contratos")
      .select("*", { count: "exact", head: true })
      .eq("departamento", departamento)
      .is("codigo_municipio", null),
  ]);
  const pct = total && total > 0 ? (sinGeo ?? 0) / total : 0;
  return pct >= UMBRAL_SUBREGISTRO ? "posible_subregistro" : "cero_verificado";
}

export async function getMunicipioComparable(
  divipola: string
): Promise<MunicipioComparable | null> {
  const sb = createAdminClient();
  const { data: ind } = await sb.rpc("brujula_indicadores_municipio", {
    p_divipola: divipola,
  });
  const { data: muni } = await sb
    .from("municipios")
    .select("divipola, nombre, departamento, sisben_pob_vulnerable")
    .eq("divipola", divipola)
    .single();
  if (!muni) return null;

  // Nombres REALES del jsonb: contratos, valor_contratos, estab_total,
  // sisben_registros, sisben_vulnerables, homicidios.
  const i = (ind as Record<string, unknown>) || {};
  const vulnerables = num(i.sisben_vulnerables);
  const muestra = num(i.sisben_registros);
  const valor = num(i.valor_contratos);
  const contratos = num(i.contratos);
  const pobVuln =
    muni.sisben_pob_vulnerable != null ? num(muni.sisben_pob_vulnerable) : null;

  const calidad = await calidadSecop(sb, muni.departamento, contratos);

  return {
    divipola: muni.divipola,
    nombre: muni.nombre,
    departamento: muni.departamento,
    poblacion_vulnerable: pobVuln,
    contratos,
    valor_secop_cop: valor,
    estab_total: num(i.estab_total),
    sisben_vulnerables: vulnerables,
    pct_vulnerable: muestra > 0 ? Math.round((vulnerables / muestra) * 1000) / 10 : null,
    homicidios: num(i.homicidios),
    inversion_per_vulnerable: pobVuln && pobVuln > 0 ? Math.round(valor / pobVuln) : null,
    calidad_dato_secop: calidad,
  };
}
