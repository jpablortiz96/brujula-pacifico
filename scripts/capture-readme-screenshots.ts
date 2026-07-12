import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import puppeteer, { type Browser, type Page, type Viewport } from "puppeteer";

type CaptureTarget = {
  route: string;
  file: string;
  label: string;
  viewport: Viewport;
  waitForSelector?: string;
  requiredText: string[];
  notes?: string;
};

type CaptureResult = {
  file: string;
  url: string;
  viewport: string;
  ok: boolean;
  status?: number;
  elapsedMs: number;
  error?: string;
  notes?: string;
};

const BASE_URL = (process.env.README_CAPTURE_BASE_URL ?? "https://brujula-pacifico.vercel.app").replace(/\/$/, "");
const OUT_DIR = path.resolve("docs/assets/readme/screenshots");
const DIAG_DIR = path.join(OUT_DIR, "diagnostics");

const desktop: Viewport = { width: 1600, height: 1000, deviceScaleFactor: 1 };
const mobile: Viewport = {
  width: 390,
  height: 844,
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
};

const targets: CaptureTarget[] = [
  { route: "/", file: "01-landing.webp", label: "Landing", viewport: desktop, requiredText: ["BRÚJULA", "contratos SECOP"] },
  { route: "/dashboard", file: "02-dashboard-territorial.webp", label: "Dashboard", viewport: desktop, waitForSelector: ".leaflet-container", requiredText: ["Pacífico colombiano", "Contratos SECOP"] },
  { route: "/agente", file: "03-agente-ia.webp", label: "Agente IA", viewport: desktop, waitForSelector: "textarea", requiredText: ["Copiloto Territorial", "9 herramientas"], notes: "No envía consultas para evitar consumo de IA." },
  { route: "/zonas-olvidadas", file: "04-zonas-olvidadas.webp", label: "Zonas olvidadas", viewport: desktop, waitForSelector: ".leaflet-container", requiredText: ["Detector de zonas olvidadas", "Argelia"] },
  { route: "/mi-plata", file: "05-mi-plata.webp", label: "Mi plata", viewport: desktop, requiredText: ["Tumaco", "sector", "contratos"] },
  { route: "/comparador", file: "06-comparador.webp", label: "Comparador", viewport: desktop, requiredText: ["Tumaco", "Cali", "Veredicto"] },
  { route: "/simulador", file: "07-simulador.webp", label: "Simulador", viewport: desktop, requiredText: ["Tumaco", "No es una predicción", "supuestos"] },
  { route: "/radar", file: "08-radar-sectorial.webp", label: "Radar sectorial", viewport: desktop, requiredText: ["Radar sectorial", "Hallazgo", "Desbalance"] },
  { route: "/brief", file: "09-brief-ejecutivo.webp", label: "Brief ejecutivo", viewport: desktop, requiredText: ["Brief ejecutivo"], notes: "Captura la interfaz; no genera PDF." },
  { route: "/bitacora", file: "10-bitacora.webp", label: "Bitácora", viewport: desktop, requiredText: ["Bitácora"] },
  { route: "/whatsapp", file: "11-whatsapp.webp", label: "WhatsApp", viewport: desktop, requiredText: ["BRÚJULA por WhatsApp", "Twilio Sandbox"] },
  { route: "/offline", file: "12-offline-pwa.webp", label: "Offline PWA", viewport: desktop, requiredText: ["offline"] },
  { route: "/", file: "13-mobile-landing.webp", label: "Landing móvil", viewport: mobile, requiredText: ["BRÚJULA"] },
  { route: "/mi-plata", file: "14-mobile-mi-plata.webp", label: "Mi plata móvil", viewport: mobile, requiredText: ["plata", "municipio"] },
];

async function visibleText(page: Page): Promise<string> {
  return page.evaluate(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    const pieces: string[] = [];
    while (walker.nextNode()) {
      const el = walker.currentNode as HTMLElement;
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      if (style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0) {
        const text = (el.innerText || "").trim();
        if (text) pieces.push(text);
      }
    }
    return pieces.join("\n").replace(/\s+/g, " ");
  });
}

async function waitForVisibleText(page: Page, requiredText: string[], timeoutMs = 90_000) {
  const started = Date.now();
  const normalizedNeedles = requiredText.map((s) => s.toLowerCase());
  while (Date.now() - started < timeoutMs) {
    const text = (await visibleText(page)).toLowerCase();
    const hasRequired = normalizedNeedles.every((needle) => text.includes(needle));
    const hasBadState = /\b(nan|undefined)\b/i.test(text) || /cargando[^a-záéíóúñ]/i.test(text);
    if (hasRequired && !hasBadState) return;
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  throw new Error(`No apareció contenido real esperado: ${requiredText.join(", ")}`);
}

async function waitForLeafletTiles(page: Page) {
  await page.waitForSelector(".leaflet-container", { timeout: 90_000 });
  await page.waitForFunction(() => {
    const tiles = Array.from(document.querySelectorAll<HTMLImageElement>(".leaflet-tile"));
    return tiles.length > 0 && tiles.every((img) => img.complete && img.naturalWidth > 0);
  }, { timeout: 30_000 }).catch(() => undefined);
  await new Promise((resolve) => setTimeout(resolve, 3_000));
}

async function sanitizeForScreenshot(page: Page) {
  await page.evaluate(() => {
    document.body.style.cursor = "default";
    document.querySelectorAll("[data-nextjs-toast], nextjs-portal").forEach((el) => el.remove());
  });
}

async function captureOne(browser: Browser, target: CaptureTarget): Promise<CaptureResult> {
  const page = await browser.newPage();
  const url = `${BASE_URL}${target.route}`;
  const started = Date.now();
  await page.setViewport(target.viewport);
  page.setDefaultNavigationTimeout(90_000);
  page.setDefaultTimeout(90_000);

  const result: CaptureResult = {
    file: target.file,
    url,
    viewport: `${target.viewport.width}x${target.viewport.height}@${target.viewport.deviceScaleFactor ?? 1}`,
    ok: false,
    elapsedMs: 0,
    notes: target.notes,
  };

  try {
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 });
    result.status = response?.status();
    await page.waitForNetworkIdle({ idleTime: 1_500, timeout: 12_000 }).catch(() => undefined);
    if (target.waitForSelector) await page.waitForSelector(target.waitForSelector, { timeout: 90_000 });
    if (target.waitForSelector === ".leaflet-container") await waitForLeafletTiles(page);
    await waitForVisibleText(page, target.requiredText);
    await sanitizeForScreenshot(page);
    await new Promise((resolve) => setTimeout(resolve, target.viewport.isMobile ? 4_000 : 5_000));
    await page.screenshot({
      path: path.join(OUT_DIR, target.file),
      type: "webp",
      quality: 82,
      fullPage: false,
    });
    result.ok = true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    result.error = message;
    await mkdir(DIAG_DIR, { recursive: true });
    await writeFile(
      path.join(DIAG_DIR, `${target.file}.txt`),
      `URL: ${url}\nLabel: ${target.label}\nError: ${message}\n\nVisible text:\n${await visibleText(page).catch(() => "")}\n`,
      "utf8"
    );
  } finally {
    result.elapsedMs = Date.now() - started;
    await page.close();
  }
  return result;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: null,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--hide-scrollbars"],
  });
  const results: CaptureResult[] = [];
  try {
    for (const target of targets) {
      console.log(`Capturando ${target.label}: ${target.route}`);
      const result = await captureOne(browser, target);
      results.push(result);
      console.log(`${result.ok ? "OK" : "FAIL"} ${result.file} ${result.elapsedMs}ms`);
    }
  } finally {
    await browser.close();
  }
  await writeFile(path.join(OUT_DIR, "capture-report.json"), JSON.stringify({
    baseUrl: BASE_URL,
    capturedAt: new Date().toISOString(),
    tool: "puppeteer 25.1.0",
    results,
  }, null, 2), "utf8");

  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    console.error(`Fallaron ${failed.length} capturas. Ver diagnostics/.`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
