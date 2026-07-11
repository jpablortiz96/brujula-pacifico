#!/usr/bin/env tsx
/**
 * seed-divipola.ts
 * Inserta/actualiza los municipios foco del Pacífico en la tabla `municipios`.
 * Requiere: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY en .env.local
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { MUNICIPIOS_FOCO } from "../lib/divipola/pacifico";

// ── Cargar .env.local de forma síncrona ───────────────────────────────────────
function loadEnvLocal() {
  try {
    const content = readFileSync(".env.local", "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      if (key && !(key in process.env)) process.env[key] = val;
    }
  } catch {
    // .env.local no encontrado — se esperan vars del sistema
  }
}

loadEnvLocal();

// ── Validar vars ──────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "ERROR: Faltan variables de entorno.\n" +
    "  NEXT_PUBLIC_SUPABASE_URL  = " + (SUPABASE_URL ? "OK" : "FALTA") + "\n" +
    "  SUPABASE_SERVICE_ROLE_KEY = " + (SERVICE_KEY  ? "OK" : "FALTA") + "\n" +
    "Crea .env.local copiando .env.example y rellena los valores."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function log(msg: string) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  log("=".repeat(60));
  log("BRÚJULA — seed:divipola");
  log("=".repeat(60));

  const rows = MUNICIPIOS_FOCO.map((m) => ({
    divipola:     m.divipola,
    nombre:       m.nombre,
    departamento: m.depto,
    codigo_depto: m.divipola.slice(0, 2),
    region:       "Pacífico",
    lat:          m.lat,
    lng:          m.lng,
  }));

  log(`Insertando ${rows.length} municipios foco...`);

  const { error, data } = await supabase
    .from("municipios")
    .upsert(rows, { onConflict: "divipola" })
    .select("divipola, nombre, departamento");

  if (error) {
    console.error("ERROR Supabase:", error.message);
    process.exit(1);
  }

  log(`✓ ${data?.length ?? 0} municipios insertados/actualizados`);
  log("");

  // Resumen por departamento
  const byDepto: Record<string, number> = {};
  for (const r of rows) {
    byDepto[r.departamento] = (byDepto[r.departamento] ?? 0) + 1;
  }

  log("Resumen por departamento:");
  for (const [dep, n] of Object.entries(byDepto)) {
    log(`  ${dep.padEnd(20)} ${n} municipio(s)`);
  }

  log("");
  log("✓ seed:divipola completado.");
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
