import { NextRequest, NextResponse } from "next/server";
import { exportZonasOlvidadas, exportComparacion } from "@/lib/export/export-data";
import { metadataToText, type DatasetExport } from "@/lib/export/open-data";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const tipo = sp.get("tipo");

  try {
    let data: DatasetExport;
    if (tipo === "zonas") {
      data = await exportZonasOlvidadas();
    } else if (tipo === "comparacion") {
      const a = sp.get("a");
      const b = sp.get("b");
      if (!a || !b) {
        return NextResponse.json(
          { error: "Faltan parámetros a y b" },
          { status: 400 }
        );
      }
      data = await exportComparacion(a, b);
    } else {
      return NextResponse.json({ error: "tipo inválido" }, { status: 400 });
    }

    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    zip.file(`${data.filename}.csv`, data.csv);
    zip.file("ficha-metadatos.txt", metadataToText(data.metadata));
    const u8 = await zip.generateAsync({ type: "uint8array" });
    // ArrayBuffer concreto (BodyInit válido; evita el genérico ArrayBufferLike).
    const body = u8.buffer.slice(
      u8.byteOffset,
      u8.byteOffset + u8.byteLength
    ) as ArrayBuffer;

    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="brujula-${tipo}-datos-abiertos.zip"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/export]", message);
    return NextResponse.json(
      { error: "No se pudo exportar", detalle: message },
      { status: 500 }
    );
  }
}
