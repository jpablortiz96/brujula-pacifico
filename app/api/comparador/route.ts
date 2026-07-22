import { NextRequest, NextResponse } from "next/server";
import {
  listarMunicipiosConDatos,
  getMunicipioComparable,
} from "@/lib/queries/comparador";
import { DATA_CACHE_HEADERS } from "@/lib/http/data-cache";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const a = sp.get("a");
  const b = sp.get("b");

  try {
    if (a && b) {
      const [ma, mb] = await Promise.all([
        getMunicipioComparable(a),
        getMunicipioComparable(b),
      ]);
      return NextResponse.json({ a: ma, b: mb }, { headers: DATA_CACHE_HEADERS });
    }
    const municipios = await listarMunicipiosConDatos();
    return NextResponse.json({ municipios }, { headers: DATA_CACHE_HEADERS });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "No se pudo cargar el comparador", detalle: message },
      { status: 500 }
    );
  }
}
