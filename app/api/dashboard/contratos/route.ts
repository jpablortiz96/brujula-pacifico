import { NextRequest, NextResponse } from "next/server";
import { getContratos } from "@/lib/queries/dashboard";
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
    const page     = Number(sp.get("page")     || "0");
    const pageSize = Number(sp.get("pageSize") || "25");
    const data = await getContratos(filters, page, pageSize);
    return NextResponse.json(data);
  } catch (err) {
    console.error("[api/dashboard/contratos]", err);
    return NextResponse.json({ error: "Internal" }, { status: 500 });
  }
}
