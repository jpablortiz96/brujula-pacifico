import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import type { Browser, Page } from "puppeteer-core";
import {
  getBrowser,
  getChromiumExecutablePath,
} from "@/lib/pdf/browser";
import { getBriefData } from "@/lib/pdf/brief-data";
import { renderBriefHTML } from "@/lib/pdf/brief-template";

export const runtime = "nodejs";
export const maxDuration = 60;

type BriefKind = "municipio" | "zona_olvidada";
type PdfErrorCode = "PDF_BROWSER_LAUNCH_FAILED" | "PDF_GENERATION_FAILED";

const PDF_FOOTER = `
  <div style="
    width:100%;
    font-family:Arial,Helvetica,sans-serif;
    font-size:7.5pt;
    color:#0A2540;
    padding:0 14mm 5mm 14mm;
    box-sizing:border-box;
  ">
    <div style="height:2px;background:#CE1126;margin-bottom:3mm;"></div>
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8mm;">
      <span style="font-weight:700;">BRUJULA &middot; Concurso Datos al Ecosistema 2026</span>
      <span style="text-align:center;flex:1;">Verifique las cifras en datos.gov.co y fuentes originales.</span>
      <span>Pagina <span class="pageNumber"></span> / <span class="totalPages"></span></span>
    </div>
  </div>
`;

function logBrief(
  event: string,
  requestId: string,
  startedAt: number,
  extra: Record<string, unknown> = {}
) {
  console.info(`[api/brief] ${event}`, {
    requestId,
    elapsedMs: Date.now() - startedAt,
    node: process.version,
    arch: process.arch,
    vercelRegion: process.env.VERCEL_REGION,
    ...extra,
  });
}

function errorCodeForStage(stage: string): PdfErrorCode {
  return stage === "chromium_path" || stage === "browser"
    ? "PDF_BROWSER_LAUNCH_FAILED"
    : "PDF_GENERATION_FAILED";
}

function publicErrorMessage(code: PdfErrorCode): string {
  if (code === "PDF_BROWSER_LAUNCH_FAILED") {
    return "No se pudo iniciar el navegador para generar el PDF.";
  }
  return "No se pudo generar el PDF.";
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
}

export async function GET(req: NextRequest) {
  const requestId = randomUUID();
  const startedAt = Date.now();
  const sp = req.nextUrl.searchParams;
  const divipola = sp.get("divipola");
  const tipo = (sp.get("tipo") || "municipio") as BriefKind;

  logBrief("start", requestId, startedAt, { divipola, tipo });

  if (!divipola) {
    return NextResponse.json(
      {
        error: "divipola requerido",
        code: "PDF_GENERATION_FAILED",
        requestId,
      },
      { status: 400 }
    );
  }

  let browser: Browser | undefined;
  let page: Page | undefined;
  let stage = "data";

  try {
    const data = await getBriefData(divipola, tipo);
    logBrief("data_ready", requestId, startedAt);

    stage = "html";
    const html = renderBriefHTML(data);
    logBrief("html_ready", requestId, startedAt, { htmlBytes: html.length });

    stage = "chromium_path";
    const executablePath = await getChromiumExecutablePath();
    logBrief("chromium_path_ready", requestId, startedAt, {
      runtime: executablePath ? "sparticuz" : "local-puppeteer",
    });

    stage = "browser";
    browser = await getBrowser(executablePath);
    logBrief("browser_ready", requestId, startedAt);

    stage = "page";
    page = await browser.newPage();
    await page.emulateMediaType("print");
    await page.setContent(html, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await page.evaluate(() => document.fonts.ready);

    stage = "pdf";
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate: PDF_FOOTER,
      margin: {
        top: "0mm",
        right: "0mm",
        bottom: "17mm",
        left: "0mm",
      },
    });
    logBrief("pdf_ready", requestId, startedAt, { pdfBytes: pdf.byteLength });

    const filename = `brujula-brief-${slugify(data.municipio.nombre)}.pdf`;
    logBrief("complete", requestId, startedAt, { filename });

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    const code = errorCodeForStage(stage);
    const error = err instanceof Error ? err : new Error(String(err));
    console.error(`[api/brief] error`, {
      requestId,
      elapsedMs: Date.now() - startedAt,
      node: process.version,
      arch: process.arch,
      vercelRegion: process.env.VERCEL_REGION,
      stage,
      code,
      name: error.name,
      message: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      {
        error: publicErrorMessage(code),
        code,
        requestId,
      },
      { status: 500 }
    );
  } finally {
    if (page) {
      try {
        await page.close();
      } catch (err) {
        console.warn("[api/brief] page_close_failed", {
          requestId,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }
    if (browser) {
      try {
        await browser.close();
      } catch (err) {
        console.warn("[api/brief] browser_close_failed", {
          requestId,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }
}
