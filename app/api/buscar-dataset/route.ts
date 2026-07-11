import { NextRequest, NextResponse } from "next/server";
import { executeTool } from "@/lib/agent/tools";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q") || "salud Pacífico";
  try {
    // Reusa la tool del agente: búsqueda viva en el catálogo de datos.gov.co.
    const result = await executeTool("buscar_dataset_datosgovco", { query });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "No se pudo buscar en datos.gov.co", detalle: message },
      { status: 500 }
    );
  }
}
