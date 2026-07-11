#!/usr/bin/env tsx
/**
 * fix-coords.ts
 * Pone lat/lng = NULL en municipios con coordenadas fuera del
 * bounding box de Colombia. Mejor sin coordenada que con outlier.
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

const LAT_MIN = -4.3,  LAT_MAX = 13.0;
const LNG_MIN = -82.0, LNG_MAX = -66.0;

async function main() {
  console.log("BRÚJULA — fix:coords");
  console.log("Limpiando coordenadas outlier...\n");

  const { data, error } = await sb
    .from("municipios")
    .select("divipola, nombre, lat, lng")
    .not("lat", "is", null)
    .not("lng", "is", null);

  if (error) { console.error("FATAL:", error); process.exit(1); }

  const outliers = (data ?? []).filter(m => {
    const lat = Number(m.lat);
    const lng = Number(m.lng);
    return lat < LAT_MIN || lat > LAT_MAX || lng < LNG_MIN || lng > LNG_MAX;
  });

  if (outliers.length === 0) {
    console.log("✅ Sin outliers. Nada que limpiar.");
    return;
  }

  let fixed = 0;
  for (const m of outliers) {
    const { error: ue } = await sb
      .from("municipios")
      .update({ lat: null, lng: null })
      .eq("divipola", m.divipola);
    if (ue) {
      console.error(`  ERROR ${m.divipola}: ${ue.message}`);
    } else {
      console.log(`  ✓ Limpiado: ${m.divipola} ${m.nombre} (lat=${m.lat}, lng=${m.lng})`);
      fixed++;
    }
  }

  console.log(`\n✓ fix:coords completado. ${fixed}/${outliers.length} municipios limpiados.`);
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
