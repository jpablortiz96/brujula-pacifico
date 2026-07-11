import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const divipola = sp.get("divipola");
  const sector = sp.get("sector");
  const fechaInicio = sp.get("fechaInicio");
  const fechaFin = sp.get("fechaFin");
  const limit = Math.min(Number(sp.get("limit") ?? 20) || 20, 100);
  const offset = Math.max(Number(sp.get("offset") ?? 0) || 0, 0);

  if (!divipola || !sector) {
    return NextResponse.json({ error: "Faltan divipola y sector" }, { status: 400 });
  }

  try {
    const sb = createAdminClient();
    let q = sb
      .from("secop_contratos")
      .select(
        "id, fecha_firma, nombre_entidad, objeto_contrato, proveedor_adjudicado, valor_contrato, estado_contrato, url_proceso",
        { count: "exact" }
      )
      .eq("codigo_municipio", divipola);

    // "Sin clasificar" corresponde a sector_inferido NULL.
    if (sector === "Sin clasificar") q = q.is("sector_inferido", null);
    else q = q.eq("sector_inferido", sector);

    if (fechaInicio) q = q.gte("fecha_firma", fechaInicio);
    if (fechaFin) q = q.lte("fecha_firma", fechaFin);

    const { data, count, error } = await q
      .order("valor_contrato", { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);
    if (error) throw new Error(error.message);

    return NextResponse.json({ contratos: data ?? [], total: count ?? 0 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "No se pudieron cargar los contratos", detalle: message },
      { status: 500 }
    );
  }
}
