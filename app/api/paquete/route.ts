import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export interface PaqueteTerritorial {
  divipola: string;
  nombre: string;
  departamento: string;
  poblacion_vulnerable: number | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  indicadores: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contratos_top: Record<string, any>[];
  generado_en: string;
}

export async function GET(req: NextRequest) {
  const divipola = req.nextUrl.searchParams.get("divipola");
  if (!divipola) {
    return NextResponse.json({ error: "divipola requerido" }, { status: 400 });
  }

  try {
    const sb = createAdminClient();
    const [{ data: ind }, { data: muni }, { data: contratos }] = await Promise.all([
      sb.rpc("brujula_indicadores_municipio", { p_divipola: divipola }),
      sb
        .from("municipios")
        .select("divipola, nombre, departamento, sisben_pob_vulnerable")
        .eq("divipola", divipola)
        .single(),
      sb
        .from("secop_contratos")
        .select("objeto_contrato, proveedor_adjudicado, valor_contrato, fecha_firma, estado_contrato, url_proceso")
        .eq("codigo_municipio", divipola)
        .order("valor_contrato", { ascending: false, nullsFirst: false })
        .limit(10),
    ]);

    if (!muni) {
      return NextResponse.json({ error: "Municipio no encontrado" }, { status: 404 });
    }

    const paquete: PaqueteTerritorial = {
      divipola: muni.divipola,
      nombre: muni.nombre,
      departamento: muni.departamento,
      poblacion_vulnerable:
        muni.sisben_pob_vulnerable != null ? Number(muni.sisben_pob_vulnerable) : null,
      indicadores: (ind as Record<string, unknown>) || {},
      contratos_top: contratos || [],
      generado_en: new Date().toISOString(),
    };

    return NextResponse.json(paquete);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "No se pudo generar el paquete", detalle: message },
      { status: 500 }
    );
  }
}
