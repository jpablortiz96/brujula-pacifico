import { createAdminClient } from "@/lib/supabase/admin";

// Claves reales del jsonb de brujula_indicadores_municipio:
//   contratos, valor_contratos, estab_total, estab_oficial, matricula_total,
//   sisben_registros, sisben_vulnerables, muertes_total, homicidios
export interface Indicadores {
  divipola?: string;
  contratos?: number;
  valor_contratos?: number;
  estab_total?: number;
  estab_oficial?: number;
  matricula_total?: number;
  sisben_registros?: number;
  sisben_vulnerables?: number;
  muertes_total?: number;
  homicidios?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ZonaOlvido = Record<string, any>;

export interface Fuente {
  label: string;
  dataset_id: string;
  url: string;
  detalle: string;
}

export interface BriefData {
  tipo: "municipio" | "zona_olvidada";
  generado_en: string;
  municipio: {
    divipola: string;
    nombre: string;
    departamento: string;
    poblacion_vulnerable_estimada: number | null;
  };
  indicadores: Indicadores;
  zona_olvido?: ZonaOlvido | null;
  prioridades: string[];
  fuentes: Fuente[];
}

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export async function getBriefData(
  divipola: string,
  tipo: "municipio" | "zona_olvidada"
): Promise<BriefData> {
  const sb = createAdminClient();

  const { data: indData } = await sb.rpc("brujula_indicadores_municipio", {
    p_divipola: divipola,
  });
  const indicadores: Indicadores = (indData as Indicadores) || {};

  const { data: muni } = await sb
    .from("municipios")
    .select("divipola, nombre, departamento, sisben_pob_vulnerable")
    .eq("divipola", divipola)
    .single();

  let zona_olvido: ZonaOlvido | null = null;
  if (tipo === "zona_olvidada") {
    const { data: zonas } = await sb.rpc("brujula_zonas_olvidadas_v3");
    zona_olvido =
      (zonas as ZonaOlvido[] | null)?.find((z) => z.divipola === divipola) || null;
  }

  const poblacionVulnerable =
    muni?.sisben_pob_vulnerable != null ? num(muni.sisben_pob_vulnerable) : null;

  // ── Prioridades derivadas de los datos reales (determinístico) ──────────
  const prioridades: string[] = [];
  const contratos = num(indicadores.contratos);
  const homicidios = num(indicadores.homicidios);
  const estabTotal = num(indicadores.estab_total);
  const sisbenVulnerables = num(indicadores.sisben_vulnerables);

  if (contratos < 20)
    prioridades.push(
      "Baja ejecución contractual: el municipio registra pocos contratos " +
        "públicos en SECOP, lo que sugiere baja inversión o subregistro."
    );
  if ((poblacionVulnerable ?? 0) > 3000 || sisbenVulnerables > 200)
    prioridades.push(
      "Alta vulnerabilidad social: población significativa en Sisbén grupos " +
        "A/B (pobreza extrema y moderada) que requiere focalización de " +
        "programas sociales."
    );
  if (homicidios > 20)
    prioridades.push(
      "Seguridad ciudadana crítica: cifras de muertes violentas por encima " +
        "del promedio regional según Medicina Legal."
    );
  if (estabTotal > 50)
    prioridades.push(
      "Cobertura educativa extensa: numerosas sedes que requieren atención " +
        "en conectividad, dotación y calidad."
    );
  if (prioridades.length === 0)
    prioridades.push(
      "El municipio presenta indicadores dentro de rangos moderados. Se " +
        "recomienda monitoreo continuo."
    );

  const fuentes: Fuente[] = [
    {
      label: "SECOP II — Contratos",
      dataset_id: "jbjy-vk9h",
      url: "https://www.datos.gov.co/d/jbjy-vk9h",
      detalle: "Contratación pública · Colombia Compra Eficiente",
    },
    {
      label: "Sisbén — DNP",
      dataset_id: "hq2v-5umk",
      url: "https://www.datos.gov.co/d/hq2v-5umk",
      detalle: "Clasificación socioeconómica · DNP",
    },
    {
      label: "Establecimientos educativos",
      dataset_id: "cfw5-qzt5",
      url: "https://www.datos.gov.co/d/cfw5-qzt5",
      detalle: "Cobertura educativa · MEN",
    },
    {
      label: "Lesiones fatales",
      dataset_id: "2kpj-cktv",
      url: "https://www.datos.gov.co/d/2kpj-cktv",
      detalle: "Muertes por causa externa · Medicina Legal",
    },
  ];

  return {
    tipo,
    generado_en: new Date().toISOString(),
    municipio: {
      divipola,
      nombre: muni?.nombre || divipola,
      departamento: muni?.departamento || "",
      poblacion_vulnerable_estimada: poblacionVulnerable,
    },
    indicadores,
    zona_olvido,
    prioridades,
    fuentes,
  };
}
