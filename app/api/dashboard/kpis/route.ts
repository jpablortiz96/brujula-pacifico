import { NextRequest, NextResponse } from "next/server";
import { getKPIs } from "@/lib/queries/dashboard";
import type { DashboardFilters } from "@/types/brujula";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const filters: DashboardFilters = {
      departamento: sp.get("departamento") || null,
      fechaInicio:  sp.get("fechaInicio")  || null,
      fechaFin:     sp.get("fechaFin")     || null,
      valorMin:     sp.get("valorMin")  ? Number(sp.get("valorMin"))  : null,
      valorMax:     sp.get("valorMax")  ? Number(sp.get("valorMax"))  : null,
      busqueda:     sp.get("busqueda")     || null,
    };
    const data = await getKPIs(filters);
    return NextResponse.json(data);
  } catch (err) {
    console.error("[api/dashboard/kpis]", err);
    return NextResponse.json({ error: "Internal" }, { status: 500 });
  }
}
