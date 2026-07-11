import { NextResponse } from "next/server";
import { getZonasConCoordenadas, getZonasSinDatos } from "@/lib/queries/zonas";

export const runtime = "nodejs";

export async function GET() {
  try {
    const [zonas, sin_datos] = await Promise.all([
      getZonasConCoordenadas(),
      getZonasSinDatos(),
    ]);
    return NextResponse.json({ zonas, sin_datos });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "No se pudo cargar el detector de zonas olvidadas", detalle: message },
      { status: 500 }
    );
  }
}
