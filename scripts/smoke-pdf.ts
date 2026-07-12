import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import type { Browser, Page } from "puppeteer-core";
import { getBriefData, type BriefData } from "@/lib/pdf/brief-data";
import { getBrowser } from "@/lib/pdf/browser";
import { renderBriefHTML } from "@/lib/pdf/brief-template";

loadEnvConfig(process.cwd());

const FOOTER_TEMPLATE = `
  <div style="width:100%;font-family:Arial,Helvetica,sans-serif;font-size:7.5pt;color:#0A2540;padding:0 14mm 5mm 14mm;box-sizing:border-box;">
    <div style="height:2px;background:#CE1126;margin-bottom:3mm;"></div>
    <div style="display:flex;justify-content:space-between;gap:8mm;">
      <span style="font-weight:700;">BRUJULA &middot; Concurso Datos al Ecosistema 2026</span>
      <span>Pagina <span class="pageNumber"></span> / <span class="totalPages"></span></span>
    </div>
  </div>
`;

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

const fixture: BriefData = {
  tipo: "municipio",
  generado_en: "2026-07-12T00:00:00.000Z",
  municipio: {
    divipola: "76001",
    nombre: "<Cali & Distrito>",
    departamento: "Valle del Cauca",
    poblacion_vulnerable_estimada: 123456,
  },
  indicadores: {
    contratos: 100,
    valor_contratos: 2500000000,
    estab_total: 50,
    estab_oficial: 40,
    sisben_registros: 2000,
    sisben_vulnerables: 1200,
    homicidios: 12,
  },
  prioridades: [
    "Prioridad con <script>alert(1)</script> para verificar escape.",
    "Focalizar inversion social y mantener trazabilidad publica.",
  ],
  fuentes: [
    {
      label: "SECOP II - Contratos",
      dataset_id: "jbjy-vk9h",
      url: "https://www.datos.gov.co/d/jbjy-vk9h",
      detalle: "Contratacion publica",
    },
    {
      label: "Sisben - DNP",
      dataset_id: "hq2v-5umk",
      url: "https://www.datos.gov.co/d/hq2v-5umk",
      detalle: "Clasificacion socioeconomica",
    },
    {
      label: "Establecimientos educativos",
      dataset_id: "cfw5-qzt5",
      url: "https://www.datos.gov.co/d/cfw5-qzt5",
      detalle: "Cobertura educativa",
    },
    {
      label: "Lesiones fatales",
      dataset_id: "2kpj-cktv",
      url: "https://www.datos.gov.co/d/2kpj-cktv",
      detalle: "Medicina Legal",
    },
  ],
};

async function generatePdf(data: BriefData, outputPath: string) {
  let browser: Browser | undefined;
  let page: Page | undefined;
  try {
    browser = await getBrowser();
    page = await browser.newPage();
    await page.emulateMediaType("print");
    await page.setContent(renderBriefHTML(data), {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await page.evaluate(() => document.fonts.ready);
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate: FOOTER_TEMPLATE,
      margin: {
        top: "0mm",
        right: "0mm",
        bottom: "17mm",
        left: "0mm",
      },
    });
    mkdirSync(path.dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, Buffer.from(pdf));
  } finally {
    await page?.close().catch(() => undefined);
    await browser?.close().catch(() => undefined);
  }
}

async function main() {
  const html = renderBriefHTML(fixture);

  assert(html.startsWith("<!doctype html>"), "HTML no empieza con doctype");
  assert(!html.includes("position: fixed"), "HTML contiene footer position: fixed");
  assert(html.includes("&lt;Cali &amp; Distrito&gt;"), "El nombre del municipio no esta escapado");
  assert(!html.includes("<script>alert(1)</script>"), "La prioridad no fue escapada");

  for (const fuente of fixture.fuentes) {
    assert(html.includes(`href="${fuente.url}"`), `Falta link real para ${fuente.dataset_id}`);
    assert(html.includes(fuente.dataset_id), `Falta dataset_id ${fuente.dataset_id}`);
  }

  console.log("[smoke-pdf] HTML checks passed");

  const hasSupabase =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!hasSupabase) {
    console.log("[smoke-pdf] Supabase env vars not found; skipping real PDF generation");
    return;
  }

  const data = await getBriefData("76001", "municipio");
  const outputPath = path.join(process.cwd(), "output", "pdf", "smoke-brief-cali.pdf");
  await generatePdf(data, outputPath);
  console.log(`[smoke-pdf] PDF generated: ${outputPath}`);
}

main().catch((err) => {
  console.error("[smoke-pdf] failed", err);
  process.exit(1);
});
