import { NextRequest, NextResponse } from "next/server";
import type { Browser } from "puppeteer-core";
import { getBrowser } from "@/lib/pdf/browser";
import { getBriefData } from "@/lib/pdf/brief-data";
import { renderBriefHTML } from "@/lib/pdf/brief-template";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const divipola = sp.get("divipola");
  const tipo = (sp.get("tipo") || "municipio") as "municipio" | "zona_olvidada";

  if (!divipola) {
    return NextResponse.json({ error: "divipola requerido" }, { status: 400 });
  }

  let browser: Browser | undefined;
  try {
    const data = await getBriefData(divipola, tipo);
    const html = renderBriefHTML(data);

    browser = await getBrowser();
    const page = await browser.newPage();
    // El HTML es autocontenido (sin recursos externos), así que "load" basta.
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", bottom: "0", left: "0", right: "0" },
    });
    await browser.close();
    browser = undefined;

    const slug = data.municipio.nombre
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/\s+/g, "-")
      .toLowerCase();
    const filename = `brujula-brief-${slug}.pdf`;

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    if (browser) {
      try {
        await browser.close();
      } catch {
        // el browser ya pudo haberse cerrado; ignorar
      }
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/brief]", message);
    return NextResponse.json(
      { error: "No se pudo generar el PDF", detalle: message },
      { status: 500 }
    );
  }
}
