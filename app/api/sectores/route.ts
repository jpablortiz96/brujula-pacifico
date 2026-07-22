import { NextRequest, NextResponse } from "next/server";
import {
  getGastoPorSector,
  getCruceSectorial,
  getRangoFechasMunicipio,
} from "@/lib/queries/sectores";
import { DATA_CACHE_HEADERS } from "@/lib/http/data-cache";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const divipola = sp.get("divipola");
  const sector = sp.get("sector");
  const fechaInicio = sp.get("fechaInicio");
  const fechaFin = sp.get("fechaFin");

  try {
    if (divipola) {
      const [sectores, rango] = await Promise.all([
        getGastoPorSector(divipola, fechaInicio, fechaFin),
        getRangoFechasMunicipio(divipola),
      ]);
      return NextResponse.json({ sectores, rango }, { headers: DATA_CACHE_HEADERS });
    }
    if (sector) {
      const municipios = await getCruceSectorial(sector, fechaInicio, fechaFin);
      return NextResponse.json({ municipios }, { headers: DATA_CACHE_HEADERS });
    }
    return NextResponse.json({ error: "Falta divipola o sector" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "No se pudo cargar el análisis sectorial", detalle: message },
      { status: 500 }
    );
  }
}
