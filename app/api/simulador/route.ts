import { NextRequest, NextResponse } from "next/server";
import { construirEscenario } from "@/lib/queries/simulador";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const divipola = sp.get("divipola");
  const inversionRaw = sp.get("inversion");

  if (!divipola) {
    return NextResponse.json({ error: "divipola requerido" }, { status: 400 });
  }

  const inversion =
    inversionRaw != null && inversionRaw !== "" ? Number(inversionRaw) : null;

  try {
    const escenario = await construirEscenario(
      divipola,
      inversion != null && Number.isFinite(inversion) ? inversion : null
    );
    return NextResponse.json(escenario);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "No se pudo construir el escenario", detalle: message },
      { status: 500 }
    );
  }
}
