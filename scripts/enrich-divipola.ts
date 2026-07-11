#!/usr/bin/env tsx
/**
 * enrich-divipola.ts
 * Lee secop_contratos donde codigo_municipio IS NULL pero ciudad IS NOT NULL,
 * aplica el matcher y actualiza el campo.
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { findDivipola, normalize } from "../lib/divipola/matcher";

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

const BATCH = 500;

async function main() {
  log("=".repeat(70));
  log("BRÚJULA — enrich:divipola");
  log("=".repeat(70));

  const stats = {
    procesados:   0,
    conMatch:     0,
    sinMatch:     0,
    actualizados: 0,
    errores:      0,
  };
  const sinMatchCiudades: Record<string, number> = {};

  let offset = 0;

  while (true) {
    const { data: rows, error } = await supabase
      .from("secop_contratos")
      .select("id, ciudad, departamento")
      .is("codigo_municipio", null)
      .not("ciudad", "is", null)
      .neq("ciudad", "")
      .range(offset, offset + BATCH - 1);

    if (error) { log(`ERROR fetch: ${error.message}`); stats.errores++; break; }
    if (!rows || rows.length === 0) { log("Sin más registros para enriquecer."); break; }

    stats.procesados += rows.length;

    // Determinar matches
    const updates: { id: string; codigo_municipio: string }[] = [];
    for (const row of rows) {
      const divipola = findDivipola(row.ciudad, row.departamento);
      if (divipola) {
        stats.conMatch++;
        updates.push({ id: row.id, codigo_municipio: divipola });
      } else {
        stats.sinMatch++;
        const key = normalize(row.ciudad ?? "");
        sinMatchCiudades[key] = (sinMatchCiudades[key] ?? 0) + 1;
      }
    }

    // Aplicar updates en lote vía upsert
    if (updates.length > 0) {
      const { error: upErr } = await supabase
        .from("secop_contratos")
        .upsert(updates.map((u) => ({ id: u.id, codigo_municipio: u.codigo_municipio })),
                { onConflict: "id" });
      if (upErr) { log(`  WARN update: ${upErr.message}`); stats.errores++; }
      else stats.actualizados += updates.length;
    }

    log(`  Procesados: ${stats.procesados} | Match: ${stats.conMatch} | Sin match: ${stats.sinMatch}`);

    if (rows.length < BATCH) break;
    offset += BATCH;
  }

  // ── Resumen ───────────────────────────────────────────────────────────────
  const pct = (n: number, d: number) => (d > 0 ? ((n / d) * 100).toFixed(1) + "%" : "—");

  log("");
  log("=".repeat(70));
  log("RESUMEN enrich:divipola");
  log("=".repeat(70));
  log(`✓ Procesados   : ${stats.procesados}`);
  log(`✓ Con match    : ${stats.conMatch}  (${pct(stats.conMatch, stats.procesados)})`);
  log(`✗ Sin match    : ${stats.sinMatch}  (${pct(stats.sinMatch, stats.procesados)})`);
  log(`✓ Actualizados : ${stats.actualizados}`);
  if (stats.errores > 0) log(`⚠ Errores      : ${stats.errores}`);

  // Top 20 ciudades sin match
  const top20 = Object.entries(sinMatchCiudades)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20);

  if (top20.length > 0) {
    log("");
    log("Top ciudades SIN match (para agregar al catálogo si procede):");
    for (const [ciudad, n] of top20) {
      log(`  "${ciudad}"  —  ${n} contratos`);
    }
  }

  log("");
  log("✓ enrich:divipola completado.");
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
