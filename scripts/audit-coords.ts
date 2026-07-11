#!/usr/bin/env tsx
/**
 * audit-coords.ts
 * Identifica municipios con coordenadas fuera del bounding box de Colombia
 * y los que usan centroides departamentales (fallback del seed).
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

try {
  const content = readFileSync(".env.local", "utf-8");
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (k && !(k in process.env)) process.env[k] = v;
  }
} catch { /* vars del sistema */ }

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

// Bounding box de Colombia (generoso)
const LAT_MIN = -4.3,  LAT_MAX = 13.0;
const LNG_MIN = -82.0, LNG_MAX = -66.0;

// Centroides de fallback del seed
const CENTROIDS: Array<{ lat: number; lng: number; label: string }> = [
  { lat: 2.45,  lng: -76.61, label: "Cauca centroide" },
  { lat: 5.69,  lng: -76.66, label: "Chocó centroide" },
  { lat: 1.21,  lng: -77.28, label: "Nariño centroide" },
  { lat: 3.45,  lng: -76.53, label: "Valle centroide" },
];

function isCentroid(lat: number, lng: number): string | null {
  for (const c of CENTROIDS) {
    if (Math.abs(lat - c.lat) < 0.01 && Math.abs(lng - c.lng) < 0.01) {
      return c.label;
    }
  }
  return null;
}

async function main() {
  console.log("=".repeat(70));
  console.log("BRÚJULA — audit:coords");
  console.log("=".repeat(70));

  const { data, error } = await sb
    .from("municipios")
    .select("divipola, nombre, departamento, codigo_depto, lat, lng")
    .not("lat", "is", null)
    .not("lng", "is", null);

  if (error) { console.error("FATAL:", error); process.exit(1); }
  if (!data?.length) { console.log("Sin municipios con coordenadas."); return; }

  console.log(`\nTotal municipios con coords: ${data.length}`);

  const outliers: typeof data = [];
  const fallbacks: typeof data = [];

  for (const m of data) {
    const lat = Number(m.lat);
    const lng = Number(m.lng);

    if (lat < LAT_MIN || lat > LAT_MAX || lng < LNG_MIN || lng > LNG_MAX) {
      outliers.push(m);
      continue;
    }

    const centLabel = isCentroid(lat, lng);
    if (centLabel) {
      (m as typeof m & { _centroid: string })._centroid = centLabel;
      fallbacks.push(m);
    }
  }

  // ── Outliers ──────────────────────────────────────────────────────────
  if (outliers.length === 0) {
    console.log("\n✅ Sin outliers — todas las coords dentro de Colombia.");
  } else {
    console.log(`\n⚠ OUTLIERS (${outliers.length}) — coordenadas FUERA de Colombia:`);
    console.log(
      "  " +
      "Divipola".padEnd(8) + " " +
      "Nombre".padEnd(26) + " " +
      "Dept".padEnd(22) + " " +
      "lat".padStart(8) + " " +
      "lng".padStart(9)
    );
    console.log("  " + "─".repeat(76));
    for (const m of outliers) {
      console.log(
        "  " +
        m.divipola.padEnd(8) + " " +
        (m.nombre ?? "").padEnd(26) + " " +
        (m.departamento ?? "").padEnd(22) + " " +
        String(m.lat).padStart(8) + " " +
        String(m.lng).padStart(9)
      );
    }
  }

  // ── Fallbacks ─────────────────────────────────────────────────────────
  console.log(`\nℹ Municipios usando centroide departamental: ${fallbacks.length}`);
  const byDepto: Record<string, number> = {};
  for (const m of fallbacks) {
    byDepto[m.codigo_depto] = (byDepto[m.codigo_depto] ?? 0) + 1;
  }
  for (const [cod, n] of Object.entries(byDepto).sort()) {
    const depto = fallbacks.find(m => m.codigo_depto === cod)?.departamento ?? cod;
    console.log(`  Dept ${cod} (${depto}): ${n} municipios con centroide`);
  }

  // ── Resumen ───────────────────────────────────────────────────────────
  const good = data.length - outliers.length - fallbacks.length;
  console.log("\n" + "=".repeat(70));
  console.log("RESUMEN");
  console.log("=".repeat(70));
  console.log(`  Con coord exacta  : ${good}`);
  console.log(`  Con centroide dept: ${fallbacks.length}`);
  console.log(`  Outliers          : ${outliers.length}`);

  if (outliers.length > 0) {
    console.log("\n⚠ ACCIÓN REQUERIDA:");
    console.log("  Ejecuta: npm run fix:coords");
    console.log("  Esto pondrá lat/lng = NULL en los municipios outlier.");
  }
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
