import { createAdminClient } from "@/lib/supabase/admin";
import { getMunicipioComparable } from "@/lib/queries/comparador";
import {
  toCSV,
  type DatasetExport,
  type DatasetMetadata,
  FUENTES_ORIGINALES,
  AUTOR,
  LICENCIA,
} from "./open-data";

const hoy = () => new Date().toISOString().slice(0, 10);
const COBERTURA_GEO =
  "Pacífico colombiano — Cauca, Chocó, Nariño y Valle del Cauca (178 municipios)";
const COBERTURA_TMP =
  "SECOP II 2017–2025 · Sisbén IV (corte vigente) · Medicina Legal (serie disponible)";

// ─── Zonas Olvidadas ─────────────────────────────────────────────────────
export async function exportZonasOlvidadas(): Promise<DatasetExport> {
  const sb = createAdminClient();
  const { data, error } = await sb.rpc("brujula_zonas_olvidadas_v4");
  if (error) throw new Error(error.message);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = ((data as any[]) ?? []).map((z) => ({
    divipola: z.divipola,
    nombre: z.nombre,
    departamento: z.departamento,
    contratos: Number(z.contratos ?? 0),
    valor_secop_cop: Number(z.valor_secop_cop ?? 0),
    poblacion_vulnerable_estimada: Number(z.poblacion_vulnerable_estimada ?? 0),
    pct_vulnerable: z.pct_vulnerable ?? "",
    homicidios: Number(z.homicidios ?? 0),
    inversion_per_vulnerable: z.inversion_per_vulnerable ?? "",
    score_olvido: z.score_olvido ?? "",
    categoria: z.categoria ?? "",
    confianza: z.confianza ?? "",
    calidad_dato_secop: z.calidad_dato_secop ?? "",
  }));

  const metadata: DatasetMetadata = {
    titulo: "Zonas Olvidadas del Pacífico Colombiano — Ranking BRÚJULA",
    descripcion:
      "Ranking de municipios del Pacífico con alta vulnerabilidad social y baja " +
      "inversión pública, con un score de olvido compuesto y verificable.",
    fuente: "BRÚJULA (producto derivado de datos abiertos de datos.gov.co)",
    licencia: LICENCIA,
    fecha_generacion: hoy(),
    autor: AUTOR,
    metodologia:
      "Score de olvido (0–1) = 0.40 · baja inversión per cápita vulnerable + " +
      "0.30 · proporción de vulnerabilidad (ponderada por factor de expansión " +
      "fex del DANE) + 0.30 · violencia relativa. La población vulnerable se " +
      "estima con el fex del DANE sobre el censo Sisbén (no sobre muestra). Solo " +
      "se rankean municipios con muestra Sisbén >= 30 registros. El campo " +
      "calidad_dato_secop distingue 'cero_verificado' (abandono real) de " +
      "'posible_subregistro' (contratos del departamento sin geolocalizar).",
    fuentes_originales: FUENTES_ORIGINALES,
    columnas: [
      { nombre: "divipola", tipo: "texto", descripcion: "Código DIVIPOLA del municipio (5 dígitos, DANE)." },
      { nombre: "nombre", tipo: "texto", descripcion: "Nombre del municipio." },
      { nombre: "departamento", tipo: "texto", descripcion: "Departamento." },
      { nombre: "contratos", tipo: "entero", descripcion: "Número de contratos SECOP geolocalizados." },
      { nombre: "valor_secop_cop", tipo: "entero", descripcion: "Valor total contratado en pesos colombianos." },
      { nombre: "poblacion_vulnerable_estimada", tipo: "entero", descripcion: "Población vulnerable expandida (fex DANE sobre Sisbén A/B)." },
      { nombre: "pct_vulnerable", tipo: "decimal", descripcion: "Porcentaje de vulnerabilidad ponderado." },
      { nombre: "homicidios", tipo: "entero", descripcion: "Homicidios registrados (Medicina Legal)." },
      { nombre: "inversion_per_vulnerable", tipo: "entero", descripcion: "COP contratados por persona vulnerable estimada." },
      { nombre: "score_olvido", tipo: "decimal", descripcion: "Score compuesto de olvido (0–1)." },
      { nombre: "categoria", tipo: "texto", descripcion: "Categoría cualitativa de olvido." },
      { nombre: "confianza", tipo: "texto", descripcion: "Nivel de confianza según tamaño de muestra." },
      { nombre: "calidad_dato_secop", tipo: "texto", descripcion: "ok | cero_verificado | posible_subregistro." },
    ],
    cobertura_geografica: COBERTURA_GEO,
    cobertura_temporal: COBERTURA_TMP,
  };

  return { filename: "zonas-olvidadas", csv: toCSV(rows), metadata };
}

// ─── Comparación de dos municipios ───────────────────────────────────────
export async function exportComparacion(
  divipolaA: string,
  divipolaB: string
): Promise<DatasetExport> {
  const [a, b] = await Promise.all([
    getMunicipioComparable(divipolaA),
    getMunicipioComparable(divipolaB),
  ]);
  if (!a || !b) throw new Error("No se encontraron ambos municipios.");

  const fila = (m: NonNullable<typeof a>) => ({
    divipola: m.divipola,
    nombre: m.nombre,
    departamento: m.departamento,
    contratos: m.contratos,
    valor_secop_cop: m.valor_secop_cop,
    poblacion_vulnerable: m.poblacion_vulnerable ?? "",
    pct_vulnerable: m.pct_vulnerable ?? "",
    homicidios: m.homicidios,
    inversion_per_vulnerable: m.inversion_per_vulnerable ?? "",
    estab_total: m.estab_total,
    calidad_dato_secop: m.calidad_dato_secop,
  });

  const metadata: DatasetMetadata = {
    titulo: `Comparación territorial: ${a.nombre} vs ${b.nombre}`,
    descripcion:
      `Indicadores comparados de ${a.nombre} (${a.departamento}) y ${b.nombre} ` +
      `(${b.departamento}): contratación, inversión per cápita, vulnerabilidad y violencia.`,
    fuente: "BRÚJULA (producto derivado de datos abiertos de datos.gov.co)",
    licencia: LICENCIA,
    fecha_generacion: hoy(),
    autor: AUTOR,
    metodologia:
      "Cifras agregadas por municipio a partir de SECOP II, Sisbén IV, MEN y " +
      "Medicina Legal. La inversión per cápita usa la población vulnerable " +
      "expandida con el factor de expansión (fex) del DANE.",
    fuentes_originales: FUENTES_ORIGINALES,
    columnas: [
      { nombre: "divipola", tipo: "texto", descripcion: "Código DIVIPOLA del municipio." },
      { nombre: "nombre", tipo: "texto", descripcion: "Nombre del municipio." },
      { nombre: "departamento", tipo: "texto", descripcion: "Departamento." },
      { nombre: "contratos", tipo: "entero", descripcion: "Contratos SECOP geolocalizados." },
      { nombre: "valor_secop_cop", tipo: "entero", descripcion: "Valor total contratado (COP)." },
      { nombre: "poblacion_vulnerable", tipo: "entero", descripcion: "Población vulnerable estimada (fex DANE)." },
      { nombre: "pct_vulnerable", tipo: "decimal", descripcion: "Porcentaje de vulnerabilidad." },
      { nombre: "homicidios", tipo: "entero", descripcion: "Homicidios (Medicina Legal)." },
      { nombre: "inversion_per_vulnerable", tipo: "entero", descripcion: "COP por persona vulnerable estimada." },
      { nombre: "estab_total", tipo: "entero", descripcion: "Establecimientos educativos." },
      { nombre: "calidad_dato_secop", tipo: "texto", descripcion: "Calidad del dato de contratación." },
    ],
    cobertura_geografica: `${a.nombre} y ${b.nombre} — Pacífico colombiano`,
    cobertura_temporal: COBERTURA_TMP,
  };

  return { filename: "comparacion", csv: toCSV([fila(a), fila(b)]), metadata };
}
