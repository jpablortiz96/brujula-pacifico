import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Chromium and Puppeteer as runtime packages for serverless PDF output.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core", "puppeteer"],
  outputFileTracingIncludes: {
    "/api/brief": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
};

export default nextConfig;
