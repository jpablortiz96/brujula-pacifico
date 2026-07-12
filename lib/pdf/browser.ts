import chromium from "@sparticuz/chromium";
import puppeteerCore, { type Browser } from "puppeteer-core";

const DEFAULT_VIEWPORT = {
  width: 1240,
  height: 1754,
  deviceScaleFactor: 1,
};

function shouldUseServerlessChromium(): boolean {
  return (
    !!process.env.VERCEL ||
    (process.env.NODE_ENV === "production" && process.platform === "linux")
  );
}

/**
 * Launches a headless browser that works locally and in Vercel Functions.
 * Production uses the bundled @sparticuz/chromium binary; local development
 * uses the browser resolved by the full puppeteer package.
 */
export async function getBrowser(resolvedExecutablePath?: string): Promise<Browser> {
  if (shouldUseServerlessChromium()) {
    const executablePath =
      resolvedExecutablePath ?? (await getChromiumExecutablePath());
    if (!executablePath) {
      throw new Error("No se pudo resolver el binario de Chromium");
    }

    chromium.setGraphicsMode = false;
    const headless = "shell" as const;
    const args = await puppeteerCore.defaultArgs({
      args: chromium.args,
      headless,
    });

    return puppeteerCore.launch({
      args,
      executablePath,
      headless,
      defaultViewport: DEFAULT_VIEWPORT,
      timeout: 45000,
    });
  }

  const puppeteer = await import("puppeteer");
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: DEFAULT_VIEWPORT,
    timeout: 45000,
  });

  return browser as unknown as Browser;
}

export async function getChromiumExecutablePath(): Promise<string | undefined> {
  return shouldUseServerlessChromium() ? chromium.executablePath() : undefined;
}
