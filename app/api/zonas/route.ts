import { NextResponse } from "next/server";
import { getZonasConCoordenadas, getZonasSinDatos } from "@/lib/queries/zonas";
import { DATA_CACHE_HEADERS } from "@/lib/http/data-cache";

export const runtime = "nodejs";

export async function GET() {
  try {
    const [zonas, sin_datos] = await Promise.all([
      getZonasConCoordenadas(),
      getZonasSinDatos(),
    ]);
    return NextResponse.json({ zonas, sin_datos }, { headers: DATA_CACHE_HEADERS });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "No se pudo cargar el detector de zonas olvidadas", detalle: message },
      { status: 500 }
    );
  }
}
