import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export type IndicadoresMunicipio = Record<string, unknown>;

async function getIndicadoresMunicipioUncached(
  divipola: string
): Promise<IndicadoresMunicipio> {
  const sb = createAdminClient();
  const { data, error } = await sb.rpc("brujula_indicadores_municipio", {
    p_divipola: divipola,
  });
  if (error) throw error;
  return (data as IndicadoresMunicipio) ?? {};
}

const getIndicadoresMunicipioCached = unstable_cache(
  getIndicadoresMunicipioUncached,
  ["indicadores-municipio"],
  { revalidate: 3600, tags: ["datos", "secop"] }
);

export async function getIndicadoresMunicipio(
  divipola: string
): Promise<IndicadoresMunicipio> {
  return getIndicadoresMunicipioCached(divipola);
}
