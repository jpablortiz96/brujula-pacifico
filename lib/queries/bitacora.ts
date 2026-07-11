import { createAdminClient } from "@/lib/supabase/admin";

export interface EntradaBitacora {
  id: string;
  actor_rol: string | null;
  municipio_divipola: string | null;
  municipio_nombre?: string | null;
  consulta: string | null;
  decision: string | null;
  datasets_usados: string[] | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: any;
  created_at: string;
}

export interface EstadisticasBitacora {
  total_consultas: number;
  municipios_consultados: number;
  tools_mas_usadas: { tool: string; veces: number }[];
  consultas_por_rol: { rol: string; veces: number }[];
}

// Extrae las tools de una fila (datasets_usados o metadata.tools).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toolsDeFila(r: any): string[] {
  if (Array.isArray(r.datasets_usados) && r.datasets_usados.length) return r.datasets_usados;
  const mt = r.metadata?.tools;
  return Array.isArray(mt) ? mt : [];
}

export async function listarBitacora(
  limit = 20,
  offset = 0
): Promise<{ entradas: EntradaBitacora[]; total: number }> {
  const sb = createAdminClient();
  const { data, count, error } = await sb
    .from("bitacora")
    .select(
      "id, actor_rol, municipio_divipola, consulta, decision, datasets_usados, metadata, created_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw new Error(error.message);

  const entradas = (data as EntradaBitacora[]) ?? [];

  // Nombres de municipios en una sola consulta aparte.
  const divipolas = [
    ...new Set(entradas.map((e) => e.municipio_divipola).filter((d): d is string => !!d)),
  ];
  if (divipolas.length) {
    const { data: munis } = await sb
      .from("municipios")
      .select("divipola, nombre")
      .in("divipola", divipolas);
    const mapa = new Map((munis ?? []).map((m) => [m.divipola, m.nombre]));
    for (const e of entradas) {
      if (e.municipio_divipola) e.municipio_nombre = mapa.get(e.municipio_divipola) ?? null;
    }
  }

  return { entradas, total: count ?? 0 };
}

export async function estadisticasBitacora(): Promise<EstadisticasBitacora> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("bitacora")
    .select("actor_rol, municipio_divipola, datasets_usados, metadata");
  if (error) throw new Error(error.message);
  const filas = data ?? [];

  const municipios = new Set<string>();
  const toolCount = new Map<string, number>();
  const rolCount = new Map<string, number>();

  for (const r of filas) {
    if (r.municipio_divipola) municipios.add(r.municipio_divipola);
    const rol = r.actor_rol ?? "desconocido";
    rolCount.set(rol, (rolCount.get(rol) ?? 0) + 1);
    for (const t of toolsDeFila(r)) toolCount.set(t, (toolCount.get(t) ?? 0) + 1);
  }

  const orden = (m: Map<string, number>) =>
    [...m.entries()].sort((a, b) => b[1] - a[1]);

  return {
    total_consultas: filas.length,
    municipios_consultados: municipios.size,
    tools_mas_usadas: orden(toolCount).map(([tool, veces]) => ({ tool, veces })),
    consultas_por_rol: orden(rolCount).map(([rol, veces]) => ({ rol, veces })),
  };
}
