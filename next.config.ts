import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Puppeteer y el binario de Chromium no deben ser empaquetados por el
  // bundler del servidor: se cargan como módulos nativos en runtime.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core", "puppeteer"],
};

export default nextConfig;
