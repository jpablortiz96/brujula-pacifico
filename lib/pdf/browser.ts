import chromium from "@sparticuz/chromium";
import puppeteerCore, { type Browser } from "puppeteer-core";

/**
 * Lanza un browser headless que funciona tanto en local como en Vercel
 * serverless. En producción usa @sparticuz/chromium (binario comprimido);
 * en local usa el Chromium que trae el dev dependency `puppeteer`.
 */
export async function getBrowser(): Promise<Browser> {
  const isProd = process.env.NODE_ENV === "production" || !!process.env.VERCEL;

  if (isProd) {
    return puppeteerCore.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
      defaultViewport: { width: 1240, height: 1754 }, // A4 @ ~150dpi
    });
  }

  // Local: puppeteer completo trae su propio Chromium.
  const puppeteer = await import("puppeteer");
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1240, height: 1754 },
  });
  // El Browser de puppeteer es estructuralmente compatible con el de core.
  return browser as unknown as Browser;
}
