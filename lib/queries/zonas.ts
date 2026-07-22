import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ZonaOlvidada {
  divipola: string;
  nombre: string;
  departamento: string;
  contratos: number;
  valor_secop_cop: number;
  sisben_total: number; // muestra local (gate de confianza)
  pct_vulnerable: number | null;
  homicidios: number;
  inversion_per_vulnerable: number | null;
  poblacion_vulnerable_estimada: number | null;
  score_olvido: number;
  categoria: string;
  confianza: string;
  calidad_dato_secop: string; // 'ok' | 'posible_subregistro' | 'cero_verificado'
}

export type ZonaConCoord = ZonaOlvidada & {
  lat: number | null;
  lng: number | null;
};

export interface ZonaSinDatos {
  divipola: string;
  nombre: string;
  departamento: string;
  contratos: number;
  sisben_total: number;
  homicidios: number;
}

async function getZonasOlvidadasUncached(): Promise<ZonaOlvidada[]> {
  const sb = createAdminClient();
  const { data, error } = await sb.rpc("brujula_zonas_olvidadas_v4");
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data as any[]) ?? []).map((r) => ({
    divipola: r.divipola,
    nombre: r.nombre,
    departamento: r.departamento,
    contratos: Number(r.contratos),
    valor_secop_cop: Number(r.valor_secop_cop),
    // v3 expone la muestra como sisben_muestra; conservamos el nombre de campo.
    sisben_total: Number(r.sisben_muestra ?? r.sisben_total ?? 0),
    pct_vulnerable: r.pct_vulnerable != null ? Number(r.pct_vulnerable) : null,
    homicidios: Number(r.homicidios),
    inversion_per_vulnerable:
      r.inversion_per_vulnerable != null ? Number(r.inversion_per_vulnerable) : null,
    poblacion_vulnerable_estimada:
      r.poblacion_vulnerable_estimada != null
        ? Number(r.poblacion_vulnerable_estimada)
        : null,
    score_olvido: Number(r.score_olvido),
    categoria: r.categoria,
    confianza: r.confianza,
    calidad_dato_secop: r.calidad_dato_secop ?? "ok",
  }));
}

const getZonasOlvidadasCached = unstable_cache(
  getZonasOlvidadasUncached,
  ["zonas-olvidadas"],
  { revalidate: 3600, tags: ["datos", "zonas"] }
);

export async function getZonasOlvidadas(): Promise<ZonaOlvidada[]> {
  return getZonasOlvidadasCached();
}

async function getZonasSinDatosUncached(): Promise<ZonaSinDatos[]> {
  const sb = createAdminClient();
  const { data, error } = await sb.rpc("brujula_zonas_sin_datos");
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data as any[]) ?? []).map((r) => ({
    divipola: r.divipola,
    nombre: r.nombre,
    departamento: r.departamento,
    contratos: Number(r.contratos),
    sisben_total: Number(r.sisben_total ?? 0),
    homicidios: Number(r.homicidios),
  }));
}

const getZonasSinDatosCached = unstable_cache(
  getZonasSinDatosUncached,
  ["zonas-sin-datos"],
  { revalidate: 3600, tags: ["datos", "zonas"] }
);

export async function getZonasSinDatos(): Promise<ZonaSinDatos[]> {
  return getZonasSinDatosCached();
}

async function getZonasConCoordenadasUncached(): Promise<ZonaConCoord[]> {
  const zonas = await getZonasOlvidadas();
  const sb = createAdminClient();
  const divipolas = zonas.map((z) => z.divipola);
  const { data: munis } = await sb
    .from("municipios")
    .select("divipola, lat, lng")
    .in("divipola", divipolas);
  const coordMap = new Map(
    (munis || []).map((m) => [
      m.divipola,
      { lat: m.lat as number | null, lng: m.lng as number | null },
    ])
  );
  return zonas.map((z) => ({
    ...z,
    lat: coordMap.get(z.divipola)?.lat ?? null,
    lng: coordMap.get(z.divipola)?.lng ?? null,
  }));
}

const getZonasConCoordenadasCached = unstable_cache(
  getZonasConCoordenadasUncached,
  ["zonas-con-coordenadas"],
  { revalidate: 3600, tags: ["datos", "zonas"] }
);

export async function getZonasConCoordenadas(): Promise<ZonaConCoord[]> {
  return getZonasConCoordenadasCached();
}
