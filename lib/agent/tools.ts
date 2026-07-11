// ─────────────────────────────────────────────────────────────────────────
// BRÚJULA · Definición y ejecución de las 7 herramientas del agente
// ─────────────────────────────────────────────────────────────────────────
import { createAdminClient } from "@/lib/supabase/admin";
import type { Citation, ToolName } from "@/types/agent";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ToolInput = Record<string, any>;

// ─── Definiciones (input_schema estilo Anthropic tool use) ───────────────
export const TOOLS_DEFINITIONS = [
  {
    name: "consultar_indicadores_municipio",
    description:
      "Devuelve los indicadores territoriales completos de un municipio " +
      "del Pacífico colombiano: contratos SECOP, valor total, sedes " +
      "educativas, matrícula, personas registradas en Sisbén, vulnerables " +
      "grupos A/B, lesiones fatales y homicidios. Usar cuando el usuario " +
      "pregunte por la situación general de un municipio o quiera comparar " +
      "varios municipios.",
    input_schema: {
      type: "object",
      properties: {
        divipola: {
          type: "string",
          description:
            "Código DIVIPOLA del municipio (5 dígitos). " +
            "Ej: 52835 (Tumaco), 76001 (Cali), 27001 (Quibdó), " +
            "19001 (Popayán), 76109 (Buenaventura), 52001 (Pasto).",
        },
      },
      required: ["divipola"],
    },
  },
  {
    name: "consultar_secop",
    description:
      "Consulta contratos SECOP del Pacífico con filtros opcionales. " +
      "Usar cuando el usuario quiera explorar contratos específicos, " +
      "buscar por proveedor, entidad u objeto, o ver gastos por rango " +
      "de fechas. Devuelve hasta 20 contratos con detalle.",
    input_schema: {
      type: "object",
      properties: {
        divipola: { type: "string", description: "Filtrar por municipio" },
        departamento: {
          type: "string",
          enum: ["Cauca", "Chocó", "Nariño", "Valle del Cauca"],
        },
        busqueda: {
          type: "string",
          description: "Texto a buscar en objeto/entidad/proveedor",
        },
        fecha_inicio: { type: "string", description: "YYYY-MM-DD" },
        fecha_fin: { type: "string", description: "YYYY-MM-DD" },
        valor_min: { type: "number", description: "Valor mínimo en COP" },
        valor_max: { type: "number", description: "Valor máximo en COP" },
        limit: { type: "number", default: 10, description: "Máx 20" },
      },
    },
  },
  {
    name: "consultar_educacion",
    description:
      "Consulta establecimientos educativos del Pacífico. Devuelve sedes, " +
      "tipo (oficial/no oficial), zona (urbana/rural), nivel, matrícula. " +
      "Usar para preguntas sobre cobertura educativa, brechas rural-urbana, " +
      "calendario académico.",
    input_schema: {
      type: "object",
      properties: {
        divipola: { type: "string" },
        zona: { type: "string", enum: ["URBANA", "RURAL"] },
        sector: { type: "string", description: "Oficial / No oficial" },
        limit: { type: "number", default: 10 },
      },
    },
  },
  {
    name: "consultar_pobreza_sisben",
    description:
      "Consulta el Sisbén — clasificación socioeconómica de personas " +
      "vulnerables. Grupo A es pobreza extrema, B es pobreza moderada, " +
      "C vulnerable, D no pobre. Usar para cruzar pobreza con inversión " +
      "pública y detectar zonas con alta vulnerabilidad y baja atención.",
    input_schema: {
      type: "object",
      properties: {
        divipola: { type: "string" },
        grupo: { type: "string", enum: ["A", "B", "C", "D"] },
        limit: { type: "number", default: 10 },
      },
    },
  },
  {
    name: "consultar_violencia",
    description:
      "Consulta lesiones fatales por causa externa según Medicina Legal. " +
      "Devuelve homicidios, suicidios, accidentes y muertes en transporte " +
      "del Pacífico colombiano. Usar para análisis de seguridad ciudadana.",
    input_schema: {
      type: "object",
      properties: {
        divipola: { type: "string" },
        manera: {
          type: "string",
          description: "homicidio, suicidio, accidente, transporte",
        },
        limit: { type: "number", default: 10 },
      },
    },
  },
  {
    name: "detectar_zonas_olvidadas",
    description:
      "Identifica los municipios más olvidados del Pacífico colombiano: " +
      "los que tienen muy pocos contratos públicos pero alta población " +
      "vulnerable. Ranking automático. NO requiere parámetros — devuelve " +
      "el resultado completo. Usar cuando el usuario pregunte por inequidad " +
      "territorial, abandono institucional, o priorización de inversión.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "buscar_dataset_datosgovco",
    description:
      "Busca datasets EN VIVO en el catálogo de datos.gov.co usando " +
      "la API de Socrata. Devuelve hasta 5 datasets relevantes con su " +
      "nombre, entidad, descripción, ID y enlace. Usar cuando el usuario " +
      "pregunte por un tema que no está pre-cargado: agricultura, salud, " +
      "ambiente, transporte, cultura, etc. Ej: si preguntan por vacunación " +
      "o deforestación, buscar esos términos.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Términos de búsqueda en español. Ej: 'vacunación', 'deforestación', 'turismo', 'empleo'.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "consultar_gasto_por_sector",
    description:
      "Devuelve en qué sectores se gastó la contratación pública de un " +
      "municipio del Pacífico (educación, salud, vías, seguridad, agua, " +
      "cultura, etc.) con montos y porcentajes. Usar cuando pregunten en qué " +
      "se gastó la plata, o por inversión sectorial de un municipio.",
    input_schema: {
      type: "object",
      properties: {
        divipola: { type: "string", description: "Código DIVIPOLA del municipio (5 dígitos)." },
      },
      required: ["divipola"],
    },
  },
  {
    name: "consultar_cruce_sectorial",
    description:
      "Cruza la inversión de un sector con su indicador de resultado en todos " +
      "los municipios del Pacífico. Usar para preguntas como '¿dónde se " +
      "invierte poco en educación pese a tener muchas sedes?' o '¿qué " +
      "municipios tienen muchos homicidios y poca inversión en seguridad?'. " +
      "Sectores válidos: Educación, Salud, Seguridad y justicia, Agua y " +
      "saneamiento, Vías e infraestructura, Agricultura y desarrollo rural, " +
      "Ambiente y gestión del riesgo, Cultura deporte y turismo, Vivienda, " +
      "Empleo y desarrollo económico, Administración y servicios generales.",
    input_schema: {
      type: "object",
      properties: {
        sector: { type: "string", description: "Nombre exacto del sector." },
      },
      required: ["sector"],
    },
  },
] as const;

// ─── Catálogo de datasets pre-cargados → citación ────────────────────────
// Permite derivar citaciones fiables a partir de las tools invocadas,
// sin depender de que el modelo formatee bien la sección "📊 Fuentes".
export const DATASET_CATALOG: Partial<Record<ToolName, Citation>> = {
  consultar_indicadores_municipio: {
    label: "Indicadores cruzados (SECOP · MEN · Sisbén · Medicina Legal)",
    dataset_id: "jbjy-vk9h",
    url: "https://www.datos.gov.co/d/jbjy-vk9h",
    detail: "Cruce municipal de 4 fuentes oficiales",
  },
  consultar_secop: {
    label: "SECOP II · Contratos",
    dataset_id: "jbjy-vk9h",
    url: "https://www.datos.gov.co/d/jbjy-vk9h",
    detail: "27.809 contratos · Pacífico 2017–2025",
  },
  consultar_educacion: {
    label: "Establecimientos educativos · MEN",
    dataset_id: "cfw5-qzt5",
    url: "https://www.datos.gov.co/d/cfw5-qzt5",
    detail: "7.325 sedes · Pacífico",
  },
  consultar_pobreza_sisben: {
    label: "Sisbén IV · DNP",
    dataset_id: "hq2v-5umk",
    url: "https://www.datos.gov.co/d/hq2v-5umk",
    detail: "57.800 personas · Pacífico",
  },
  consultar_violencia: {
    label: "Lesiones fatales · Medicina Legal",
    dataset_id: "2kpj-cktv",
    url: "https://www.datos.gov.co/d/2kpj-cktv",
    detail: "8.281 registros · Pacífico",
  },
  detectar_zonas_olvidadas: {
    label: "Zonas olvidadas (score compuesto BRÚJULA)",
    dataset_id: "jbjy-vk9h",
    url: "https://www.datos.gov.co/d/jbjy-vk9h",
    detail: "Ranking de inequidad territorial",
  },
};

// ─── Executor ────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function executeTool(name: string, input: ToolInput): Promise<any> {
  const sb = createAdminClient();

  switch (name) {
    case "consultar_indicadores_municipio": {
      const { data, error } = await sb.rpc("brujula_indicadores_municipio", {
        p_divipola: input.divipola,
      });
      if (error) throw new Error(error.message);
      // La RPC devuelve un objeto jsonb directamente (no un array).
      const result = data;
      if (!result || (result as { contratos?: number }).contratos == null) {
        return {
          encontrado: false,
          mensaje: `No hay datos para DIVIPOLA ${input.divipola}`,
        };
      }
      return result;
    }

    case "consultar_secop": {
      let q = sb
        .from("secop_contratos")
        .select(
          "id, fecha_firma, nombre_entidad, ciudad, codigo_municipio, " +
            "objeto_contrato, proveedor_adjudicado, valor_contrato, " +
            "estado_contrato, modalidad_contratacion, url_proceso"
        )
        .order("fecha_firma", { ascending: false, nullsFirst: false });

      if (input.divipola) q = q.eq("codigo_municipio", input.divipola);
      if (input.departamento) q = q.eq("departamento", input.departamento);
      if (input.fecha_inicio) q = q.gte("fecha_firma", input.fecha_inicio);
      if (input.fecha_fin) q = q.lte("fecha_firma", input.fecha_fin);
      if (input.valor_min) q = q.gte("valor_contrato", input.valor_min);
      if (input.valor_max) q = q.lte("valor_contrato", input.valor_max);
      if (input.busqueda) {
        const s = String(input.busqueda).replace(/[%,]/g, "");
        q = q.or(
          `objeto_contrato.ilike.%${s}%,nombre_entidad.ilike.%${s}%,proveedor_adjudicado.ilike.%${s}%`
        );
      }
      const { data, error } = await q.limit(Math.min(input.limit || 10, 20));
      if (error) throw new Error(error.message);
      return { contratos: data, total_devueltos: data?.length || 0 };
    }

    case "consultar_educacion": {
      let q = sb
        .from("educacion_establecimientos")
        .select(
          "codigo_dane, nombre_estab, departamento, municipio, " +
            "codigo_municipio, sector, calendario, total_matricula, cantidad_sedes"
        );
      if (input.divipola) q = q.eq("codigo_municipio", input.divipola);
      if (input.sector) q = q.ilike("sector", `%${input.sector}%`);
      const { data, error } = await q.limit(Math.min(input.limit || 10, 20));
      if (error) throw new Error(error.message);
      return { establecimientos: data, total_devueltos: data?.length || 0 };
    }

    case "consultar_pobreza_sisben": {
      let q = sb
        .from("sisben_personas")
        .select(
          "codigo_municipio, grupo, clasificacion, nivel, zona, fex",
          { count: "exact" }
        );
      if (input.divipola) q = q.eq("codigo_municipio", input.divipola);
      if (input.grupo) q = q.eq("grupo", input.grupo);
      const { data, count, error } = await q.limit(
        Math.min(input.limit || 10, 20)
      );
      if (error) throw new Error(error.message);
      return { personas: data, total: count };
    }

    case "consultar_violencia": {
      let q = sb
        .from("medicina_lesiones")
        .select(
          "año_hecho, mes_hecho, departamento, municipio, codigo_municipio, " +
            "sexo, edad_grupo, manera, mecanismo, escenario",
          { count: "exact" }
        )
        .order("año_hecho", { ascending: false, nullsFirst: false });
      if (input.divipola) q = q.eq("codigo_municipio", input.divipola);
      if (input.manera) q = q.ilike("manera", `%${input.manera}%`);
      const { data, count, error } = await q.limit(
        Math.min(input.limit || 10, 20)
      );
      if (error) throw new Error(error.message);
      return { lesiones: data, total: count };
    }

    case "detectar_zonas_olvidadas": {
      // v2 riguroso: ranking (muestra suficiente) + complemento de
      // municipios excluidos por muestra insuficiente (transparencia).
      const [olvidadas, sinDatos] = await Promise.all([
        sb.rpc("brujula_zonas_olvidadas_v4"),
        sb.rpc("brujula_zonas_sin_datos"),
      ]);
      if (olvidadas.error) throw new Error(olvidadas.error.message);
      return {
        zonas_olvidadas: olvidadas.data,
        // Complementario: si falla, no rompemos la respuesta.
        municipios_requieren_verificacion: sinDatos.error ? [] : sinDatos.data,
        metodologia:
          "Inversión per cápita calculada sobre población vulnerable estimada " +
          "mediante factor de expansión (fex) del DANE, no sobre muestra. Score = " +
          "40% baja inversión per cápita + 30% proporción vulnerabilidad ponderada " +
          "+ 30% violencia relativa. Solo rankea municipios con muestra >=30. " +
          "El campo calidad_dato_secop distingue 'cero_verificado' (abandono real) " +
          "de 'posible_subregistro' (contratos del departamento sin geolocalizar).",
      };
    }

    case "buscar_dataset_datosgovco": {
      // Búsqueda viva en el catálogo de Socrata
      const url = `https://api.us.socrata.com/api/catalog/v1?q=${encodeURIComponent(
        input.query
      )}&domains=www.datos.gov.co&limit=5`;
      try {
        const res = await fetch(url, {
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error(`Catalog API ${res.status}`);
        const json = await res.json();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const datasets = (json.results || []).map((r: any) => ({
          id: r.resource?.id,
          nombre: r.resource?.name,
          descripcion: (r.resource?.description || "").slice(0, 300),
          entidad:
            r.classification?.domain_metadata?.find(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (m: any) => m.key === "Entidad"
            )?.value || r.resource?.attribution,
          categoria: r.classification?.domain_category,
          url: `https://www.datos.gov.co/d/${r.resource?.id}`,
        }));
        return {
          datasets_encontrados: datasets,
          total: datasets.length,
          consulta_original: input.query,
        };
      } catch (err) {
        return {
          error: "No se pudo consultar el catálogo de datos.gov.co",
          detalle: err instanceof Error ? err.message : String(err),
        };
      }
    }

    case "consultar_gasto_por_sector": {
      // Pasamos las fechas (aunque sean null) para desambiguar el overload
      // de la función (existe versión de 1 y de 3 parámetros).
      const { data, error } = await sb.rpc("brujula_gasto_por_sector", {
        p_divipola: input.divipola,
        p_fecha_inicio: input.fecha_inicio ?? null,
        p_fecha_fin: input.fecha_fin ?? null,
      });
      if (error) throw new Error(error.message);
      return {
        gasto_por_sector: data,
        nota: "La clasificación por sector es APROXIMADA (análisis automático del objeto contractual), verificable en SECOP.",
      };
    }

    case "consultar_cruce_sectorial": {
      const { data, error } = await sb.rpc("brujula_cruce_sectorial", {
        p_sector: input.sector,
        p_fecha_inicio: input.fecha_inicio ?? null,
        p_fecha_fin: input.fecha_fin ?? null,
      });
      if (error) throw new Error(error.message);
      const top = Array.isArray(data) ? data.slice(0, 20) : data;
      return {
        cruce_sectorial: top,
        nota: "Clasificación sectorial APROXIMADA. El indicador de resultado solo existe para Educación (sedes) y Seguridad y justicia (homicidios).",
      };
    }

    default:
      throw new Error(`Tool desconocida: ${name}`);
  }
}
