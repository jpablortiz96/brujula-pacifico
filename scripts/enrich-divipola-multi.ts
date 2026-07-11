#!/usr/bin/env tsx
/**
 * enrich-divipola-multi.ts
 * Enriquece codigo_municipio en cualquiera de las tablas del ecosistema BRÚJULA.
 *
 * Para educación, sisbén y medicina, el código ya viene del dataset directamente
 * (cod_dane_municipio, cod_mpio, codigo_dane_municipio). Este script valida
 * la cobertura y usa fuzzy-matching como fallback donde código sea NULL.
 *
 * Uso:
 *   npm run enrich:multi               → procesa las 4 tablas
 *   npm run enrich:multi -- secop      → solo secop_contratos
 *   npm run enrich:multi -- educacion  → solo educacion_establecimientos
 *   npm run enrich:multi -- sisben     → solo sisben_personas
 *   npm run enrich:multi -- medicina   → solo medicina_lesiones
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { findDivipola } from "../lib/divipola/matcher";

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

interface TableConfig {
  table: string;
  cityCol: string | null;   // columna con nombre de ciudad (para fuzzy)
  deptoCol: string | null;  // columna con nombre departamento (para fuzzy)
}

const TABLES: Record<string, TableConfig> = {
  secop: {
    table: "secop_contratos",
    cityCol: "ciudad",
    deptoCol: "departamento",
  },
  educacion: {
    table: "educacion_establecimientos",
    cityCol: "municipio",
    deptoCol: "departamento",
  },
  sisben: {
    table: "sisben_personas",
    cityCol: null,   // no tiene nombre de ciudad, solo cod_mpio
    deptoCol: null,
  },
  medicina: {
    table: "medicina_lesiones",
    cityCol: "municipio",
    deptoCol: "departamento",
  },
};

function log(msg: string) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

async function enrichTable(key: string, cfg: TableConfig) {
  log(`\n${"─".repeat(60)}`);
  log(`Tabla: ${cfg.table}`);

  // Cobertura actual
  const { count: total } = await sb
    .from(cfg.table).select("*", { count: "exact", head: true });
  const { count: conMuni } = await sb
    .from(cfg.table).select("*", { count: "exact", head: true })
    .not("codigo_municipio", "is", null);

  const pct = (n: number, d: number) => d > 0 ? ((n / d) * 100).toFixed(1) + "%" : "—";
  log(`  Total: ${total ?? 0}  |  Con codigo_municipio: ${conMuni ?? 0} (${pct(conMuni ?? 0, total ?? 1)})`);

  if ((conMuni ?? 0) === (total ?? 0)) {
    log("  ✓ Cobertura 100% — no hay nada que enriquecer.");
    return;
  }

  // Para sisbén: no hay fuzzy posible (sin texto de municipio)
  if (!cfg.cityCol) {
    log("  ℹ Sin columna de nombre de ciudad. No se puede hacer fuzzy-match.");
    log("  Verifica que el codigo_municipio se haya asignado en el script de ingesta.");
    return;
  }

  // Fuzzy-match donde codigo_municipio IS NULL
  const PAGE = 500;
  let offset = 0;
  let totalMatch = 0, totalNoMatch = 0;

  while (true) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (sb.from(cfg.table) as any)
      .select(`id, ${cfg.cityCol}, ${cfg.deptoCol ?? "departamento"}`)
      .is("codigo_municipio", null)
      .not(cfg.cityCol, "is", null)
      .range(offset, offset + PAGE - 1);

    if (error) { log(`  ERROR: ${error.message}`); break; }
    if (!data?.length) break;

    const updates: Array<{ id: string; codigo_municipio: string }> = [];

    for (const row of data as Record<string, string>[]) {
      const ciudad = row[cfg.cityCol!];
      const depto  = cfg.deptoCol ? row[cfg.deptoCol] : null;
      const divipola = findDivipola(ciudad, depto);
      if (divipola) {
        updates.push({ id: row.id, codigo_municipio: divipola });
        totalMatch++;
      } else {
        totalNoMatch++;
      }
    }

    // Upsert updates
    for (let i = 0; i < updates.length; i += 100) {
      const chunk = updates.slice(i, i + 100);
      await Promise.all(chunk.map(u =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (sb.from(cfg.table) as any)
          .update({ codigo_municipio: u.codigo_municipio })
          .eq("id", u.id)
      ));
    }

    offset += PAGE;
    if (data.length < PAGE) break;
  }

  log(`  Fuzzy-match: ${totalMatch} matcheados | ${totalNoMatch} sin match`);

  // Cobertura final
  const { count: finalMuni } = await sb
    .from(cfg.table).select("*", { count: "exact", head: true })
    .not("codigo_municipio", "is", null);
  log(`  Cobertura final: ${finalMuni ?? 0} / ${total ?? 0} (${pct(finalMuni ?? 0, total ?? 1)})`);
}

async function main() {
  log("=".repeat(70));
  log("BRÚJULA — enrich:divipola-multi");
  log("=".repeat(70));

  const arg = process.argv[2]?.toLowerCase();
  const targets = arg === "all" || !arg
    ? Object.keys(TABLES)
    : Object.keys(TABLES).filter(k => k === arg);

  if (targets.length === 0) {
    console.error(`Argumento inválido: "${arg}". Opciones: ${Object.keys(TABLES).join(" | ")} | all`);
    process.exit(1);
  }

  for (const key of targets) {
    await enrichTable(key, TABLES[key]);
  }

  log("\n✓ enrich:multi completado.");
}

main().catch(e => { console.error("FATAL:", e); process.exit(1); });
