#!/usr/bin/env tsx
/**
 * seed-municipios-pacifico.ts
 * Inserta/actualiza todos los municipios del Pacífico en la tabla `municipios`.
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { DIVIPOLA_PACIFICO_UNIQUE } from "../lib/divipola/catalogo-pacifico";

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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("ERROR: Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function log(msg: string) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

async function main() {
  log("=".repeat(60));
  log("BRÚJULA — seed:pacifico");
  log(`Total municipios a insertar: ${DIVIPOLA_PACIFICO_UNIQUE.length}`);
  log("=".repeat(60));

  const rows = DIVIPOLA_PACIFICO_UNIQUE.map((m) => ({
    divipola:     m.divipola,
    nombre:       m.nombre,
    departamento: m.depto,
    codigo_depto: m.codigo_depto,
    region:       "Pacífico",
  }));

  // Insertar en chunks de 100
  let total = 0;
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    const { error, data } = await supabase
      .from("municipios")
      .upsert(chunk, { onConflict: "divipola" })
      .select("divipola");

    if (error) {
      console.error(`ERROR chunk ${i}: ${error.message}`);
      continue;
    }
    total += data?.length ?? 0;
    log(`  Insertados: ${total}/${rows.length}`);
  }

  // Resumen por departamento
  log("");
  log("Resumen por departamento:");
  const byDepto: Record<string, number> = {};
  rows.forEach((r) => { byDepto[r.departamento] = (byDepto[r.departamento] ?? 0) + 1; });
  for (const [dep, n] of Object.entries(byDepto)) {
    log(`  ${dep.padEnd(20)} ${n} municipios`);
  }
  log("");
  log(`✓ Total insertados/actualizados: ${total}`);
  log("✓ seed:pacifico completado.");
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
