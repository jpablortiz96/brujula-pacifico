import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import SwRegister from "./sw-register";
import ConnectionBanner from "@/components/brujula/ConnectionBanner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BRÚJULA — Inteligencia Territorial del Pacífico",
  description:
    "Sistema operativo de inteligencia territorial abierta de Colombia. Cruza SECOP con indicadores sociales del Pacífico colombiano.",
  keywords: ["datos abiertos", "Colombia", "Pacífico", "SECOP", "contratación pública", "MinTIC"],
  authors: [{ name: "Equipo BRÚJULA" }],
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "BRÚJULA" },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
  openGraph: {
    title: "BRÚJULA",
    description: "Datos.gov.co tiene la información. BRÚJULA tiene el criterio.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0A2540",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${inter.variable} h-full`}>
      <body className="min-h-full bg-[rgb(244_242_236)] text-[rgb(10_37_64)] antialiased">
        {/* El chrome (header/footer) lo aporta cada vista: la landing su propio
            footer; los módulos su GovHeader. El layout solo provee el shell. */}
        <Providers>
          <ConnectionBanner />
          {children}
        </Providers>
        <SwRegister />
      </body>
    </html>
  );
}
