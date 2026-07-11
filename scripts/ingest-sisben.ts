#!/usr/bin/env tsx
/**
 * ingest-sisben.ts — RE-INGESTA BALANCEADA POR CUOTA DE MUNICIPIO
 *
 * Problema que resuelve:
 *   La ingesta anterior bajaba por departamento con `order by cod_mpio ASC` +
 *   offset y un tope de páginas. Con ~175k registros/depto pero solo 15k de
 *   tope, la descarga se quedaba en los cod_mpio más bajos y NUNCA llegaba a
 *   municipios con código alto (Timbiquí 19807, Toribío 19809, Villa Rica
 *   19845...). El detector de zonas olvidadas rankeaba artefactos de muestreo.
 *
 * Estrategia nueva (cuota equitativa):
 *   - Itera municipio por municipio sobre el catálogo Pacífico (179 mpios).
 *   - Para cada cod_mpio: fetch $where=cod_mpio='XXXXX' con $limit=CUOTA (400).
 *   - Cada municipio aporta hasta 400 personas → nadie acapara la muestra.
 *   - Municipios sin datos en el dataset quedan con 0 (es correcto: el
 *     algoritmo v2 los trata como "muestra insuficiente", no como olvidados).
 *
 * PK: uuid auto-generado. INSERT plano. Rate limit 250ms entre municipios.
 *
 * 📋 ACCIÓN MANUAL PREVIA: en Supabase SQL Editor ejecuta:
 *      TRUNCATE TABLE sisben_personas;
 *    (este script NO trunca por seguridad; solo inserta)
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { parseSocrataNumber } from "../lib/socrata/parsers";
import { DIVIPOLA_PACIFICO_UNIQUE } from "../lib/divipola/catalogo-pacifico";

// ── Cargar .env.local ────────────────────────────────────────────────────
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
} catch {
  /* vars del sistema */
}

const DATASET = "hq2v-5umk";
const BASE = `https://www.datos.gov.co/resource/${DATASET}.json`;
const BATCH = 200;
const SLEEP_MS = 250;

// Cuota por municipio (configurable con --cuota N)
const CUOTA = (() => {
  const i = process.argv.indexOf("--cuota");
  return i !== -1 ? parseInt(process.argv[i + 1], 10) : 400;
})();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

type Raw = Record<string, unknown>;

function mapRow(r: Raw): Record<string, unknown> | null {
  const mpio = (r["cod_mpio"] as string)?.trim();
  if (!mpio) return null;
  return {
    codigo_municipio: mpio,
    grupo: (r["grupo"] as string) ?? null,
    clasificacion: (r["clasificacion"] as string) ?? null,
    nivel: (r["nivel"] as string) ?? null,
    zona: (r["zona"] as string) ?? null,
    fex: parseSocrataNumber(r["fex"] as string),
    corte: (r["corte"] as string) ?? null,
    raw: r,
  };
}

async function fetchMunicipio(cod: string): Promise<Raw[]> {
  const where = encodeURIComponent(`cod_mpio = '${cod}'`);
  const url = `${BASE}?$where=${where}&$limit=${CUOTA}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 160)}`);
  }
  return res.json();
}

function log(msg: string) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const fmt = (n: number) => new Intl.NumberFormat("es-CO").format(n);

async function main() {
  log("=".repeat(72));
  log("BRÚJULA — ingest:sisben (CUOTA POR MUNICIPIO, balanceada)");
  log(`Dataset: ${DATASET}  |  Cuota: ${CUOTA}/municipio  |  Municipios: ${DIVIPOLA_PACIFICO_UNIQUE.length}`);
  log("=".repeat(72));
  log("");
  log("📋 ACCIÓN MANUAL: antes de correr esto, en Supabase SQL Editor ejecuta:");
  log("     TRUNCATE TABLE sisben_personas;");
  log("");

  const stats = {
    descargados: 0,
    insertados: 0,
    errores: 0,
    conDatos: 0,
    sinDatos: 0,
    porMunicipio: [] as { cod: string; nombre: string; n: number }[],
  };

  let idx = 0;
  for (const m of DIVIPOLA_PACIFICO_UNIQUE) {
    idx++;
    let batch: Raw[] = [];
    try {
      batch = await fetchMunicipio(m.divipola);
    } catch (e) {
      log(`  ⚠️  ${m.divipola} ${m.nombre}: error descarga (${e})`);
      stats.errores++;
      await sleep(SLEEP_MS * 3);
      continue;
    }

    stats.descargados += batch.length;
    const mapped = batch
      .map(mapRow)
      .filter((r): r is NonNullable<typeof r> => r !== null);

    let insertadosMuni = 0;
    for (let i = 0; i < mapped.length; i += BATCH) {
      const chunk = mapped.slice(i, i + BATCH);
      const { error } = await supabase.from("sisben_personas").insert(chunk);
      if (error) {
        log(`  ⚠️  ${m.divipola} insert: ${error.message}`);
        stats.errores++;
      } else {
        insertadosMuni += chunk.length;
      }
    }

    stats.insertados += insertadosMuni;
    stats.porMunicipio.push({ cod: m.divipola, nombre: m.nombre, n: insertadosMuni });
    if (insertadosMuni > 0) stats.conDatos++;
    else stats.sinDatos++;

    const tag = insertadosMuni > 0 ? "✓" : "·";
    log(
      `  ${tag} [${String(idx).padStart(3)}/${DIVIPOLA_PACIFICO_UNIQUE.length}] ` +
        `${m.divipola} ${m.nombre.padEnd(28)} ${fmt(insertadosMuni).padStart(5)} personas`
    );

    await sleep(SLEEP_MS);
  }

  // ── Resumen ────────────────────────────────────────────────────────────
  log("");
  log("=".repeat(72));
  log("RESUMEN FINAL");
  log("=".repeat(72));
  log(`✓ Descargados            : ${fmt(stats.descargados)}`);
  log(`✓ Insertados             : ${fmt(stats.insertados)}`);
  log(`✓ Municipios con datos   : ${stats.conDatos}`);
  log(`· Municipios sin datos   : ${stats.sinDatos}`);
  if (stats.errores > 0) log(`⚠ Errores                 : ${stats.errores}`);
  const prom =
    stats.conDatos > 0 ? Math.round(stats.insertados / stats.conDatos) : 0;
  log(`  Promedio (con datos)    : ${fmt(prom)}/municipio`);

  const conDatos = stats.porMunicipio
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);

  log("\n  Top 10 con MÁS registros:");
  for (const x of conDatos.slice(0, 10)) {
    log(`    ${x.cod}  ${x.nombre.padEnd(28)} ${fmt(x.n).padStart(5)}`);
  }
  log("\n  Top 10 con MENOS registros (pero > 0):");
  for (const x of conDatos.slice(-10).reverse()) {
    log(`    ${x.cod}  ${x.nombre.padEnd(28)} ${fmt(x.n).padStart(5)}`);
  }

  log("\n✓ ingest:sisben completado. Siguiente: npm run enrich:multi");
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});

export {};
