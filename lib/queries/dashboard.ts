import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DashboardKPIs, MunicipioStats, ContratoSecop, DashboardFilters } from "@/types/brujula";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters(query: any, f: DashboardFilters): any {
  if (f.departamento) query = query.eq("departamento", f.departamento);
  if (f.fechaInicio)  query = query.gte("fecha_firma", f.fechaInicio);
  if (f.fechaFin)     query = query.lte("fecha_firma", f.fechaFin);
  if (f.valorMin != null) query = query.gte("valor_contrato", f.valorMin);
  if (f.valorMax != null) query = query.lte("valor_contrato", f.valorMax);
  if (f.busqueda) {
    const s = f.busqueda.replace(/[%,]/g, "");
    query = query.or(
      `objeto_contrato.ilike.%${s}%,nombre_entidad.ilike.%${s}%,proveedor_adjudicado.ilike.%${s}%`
    );
  }
  return query;
}

// ── KPIs via RPC — agregación 100% en Postgres ────────────────────────
function serializeFilters(filters: DashboardFilters): string {
  return JSON.stringify({
    departamento: filters.departamento ?? null,
    fechaInicio: filters.fechaInicio ?? null,
    fechaFin: filters.fechaFin ?? null,
    valorMin: filters.valorMin ?? null,
    valorMax: filters.valorMax ?? null,
    busqueda: filters.busqueda ?? null,
  });
}

function deserializeFilters(serializedFilters: string): DashboardFilters {
  return JSON.parse(serializedFilters) as DashboardFilters;
}

async function getKPIsUncached(filters: DashboardFilters): Promise<DashboardKPIs> {
  const sb = createAdminClient();
  const { data, error } = await sb.rpc("brujula_kpis", {
    p_departamento: filters.departamento ?? null,
    p_fecha_inicio: filters.fechaInicio  ?? null,
    p_fecha_fin:    filters.fechaFin     ?? null,
    p_valor_min:    filters.valorMin     ?? null,
    p_valor_max:    filters.valorMax     ?? null,
    p_busqueda:     filters.busqueda     ?? null,
  });
  if (error) throw error;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = ((data as any[]) ?? [])[0] ?? {};
  return {
    total_contratos:      Number(r.total_contratos    ?? 0),
    valor_total_cop:      Number(r.valor_total_cop    ?? 0),
    municipios_cubiertos: Number(r.municipios_cubiertos ?? 0),
    entidades_distintas:  Number(r.entidades_distintas  ?? 0),
    fecha_min: r.fecha_min ?? null,
    fecha_max: r.fecha_max ?? null,
  };
}

const getKPIsCached = unstable_cache(
  async (serializedFilters: string) => getKPIsUncached(deserializeFilters(serializedFilters)),
  ["dashboard-kpis"],
  { revalidate: 3600, tags: ["datos", "secop"] }
);

export async function getKPIs(filters: DashboardFilters): Promise<DashboardKPIs> {
  return getKPIsCached(serializeFilters(filters));
}

// ── Stats por municipio via RPC ───────────────────────────────────────
async function getMunicipiosStatsUncached(
  filters: DashboardFilters
): Promise<MunicipioStats[]> {
  const sb = createAdminClient();
  const { data, error } = await sb.rpc("brujula_municipios_stats", {
    p_departamento: filters.departamento ?? null,
    p_fecha_inicio: filters.fechaInicio  ?? null,
    p_fecha_fin:    filters.fechaFin     ?? null,
    p_valor_min:    filters.valorMin     ?? null,
    p_valor_max:    filters.valorMax     ?? null,
    p_busqueda:     filters.busqueda     ?? null,
  });
  if (error) throw error;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data as any[]) ?? []).map((r) => ({
    divipola:     r.divipola     as string,
    nombre:       r.nombre       as string,
    departamento: r.departamento as string,
    lat:  r.lat  != null ? Number(r.lat)  : null,
    lng:  r.lng  != null ? Number(r.lng)  : null,
    contratos:   Number(r.contratos   ?? 0),
    valor_total: Number(r.valor_total  ?? 0),
  }));
}

const getMunicipiosStatsCached = unstable_cache(
  async (serializedFilters: string) =>
    getMunicipiosStatsUncached(deserializeFilters(serializedFilters)),
  ["dashboard-municipios"],
  { revalidate: 3600, tags: ["datos", "secop"] }
);

export async function getMunicipiosStats(
  filters: DashboardFilters
): Promise<MunicipioStats[]> {
  return getMunicipiosStatsCached(serializeFilters(filters));
}

// ── Contratos paginados (sigue usando PostgREST directo) ──────────────
export async function getContratos(
  filters: DashboardFilters,
  page = 0,
  pageSize = 25
): Promise<{ rows: ContratoSecop[]; total: number }> {
  const sb = createAdminClient();
  let q = sb
    .from("secop_contratos")
    .select(
      "id, referencia_contrato, nombre_entidad, departamento, ciudad, " +
      "codigo_municipio, objeto_contrato, tipo_contrato, modalidad_contratacion, " +
      "estado_contrato, proveedor_adjudicado, valor_contrato, fecha_firma, " +
      "url_proceso",
      { count: "exact" }
    )
    .order("fecha_firma", { ascending: false, nullsFirst: false });
  q = applyFilters(q, filters);
  q = q.range(page * pageSize, page * pageSize + pageSize - 1);
  const { data, count, error } = await q;
  if (error) throw error;
  return { rows: (data || []) as unknown as ContratoSecop[], total: count ?? 0 };
}
