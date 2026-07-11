import { NextRequest, NextResponse } from "next/server";
import { listarBitacora, estadisticasBitacora } from "@/lib/queries/bitacora";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const limit = Math.min(Number(sp.get("limit") ?? 20) || 20, 200);
  const offset = Math.max(Number(sp.get("offset") ?? 0) || 0, 0);

  try {
    const [{ entradas, total }, estadisticas] = await Promise.all([
      listarBitacora(limit, offset),
      estadisticasBitacora(),
    ]);
    return NextResponse.json({ entradas, total, estadisticas });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "No se pudo cargar la bitácora", detalle: message },
      { status: 500 }
    );
  }
}
