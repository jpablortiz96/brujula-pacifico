#!/usr/bin/env tsx
/**
 * ingest-educacion.ts
 * Ingesta establecimientos educativos MEN (cfw5-qzt5) para el Pacífico.
 *
 * Columnas reales confirmadas con inspect:
 *   codigo_dane, a_o, departamento, municipio, cod_dane_municipio,
 *   nombre_establecimiento, sector, calendario, total_matricula, cantidad_sedes
 *
 * PK real: (codigo_dane, a_o) — 1 fila por establecimiento por año.
 * Se desduplicá dentro de cada batch antes de insertar.
 * Usa upsert con ignoreDuplicates (INSERT ... ON CONFLICT DO NOTHING).
 * Batch size: 200 para reducir colisiones intra-batch.
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { parseSocrataNumber } from "../lib/socrata/parsers";

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

const DATASET  = "cfw5-qzt5";
const BASE     = `https://www.datos.gov.co/resource/${DATASET}.json`;
const PAGE     = 1000;
const BATCH    = 200;
const SLEEP_MS = 400;

const MAX_PAGES = (() => {
  const i = process.argv.indexOf("--maxPages");
  return i !== -1 ? parseInt(process.argv[i + 1], 10) : 30;
})();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

// Filtro Socrata por nombre de departamento del Pacífico (con variantes)
const WHERE = [
  "upper(departamento) in (",
  "'CAUCA','CHOCÓ','CHOCO','NARIÑO','NARINO','VALLE DEL CAUCA','VALLE'",
  ")",
].join("");

type Raw = Record<string, unknown>;

// Departamentos válidos para filtro client-side post-fetch
const DEPTOS_PACIFICO = new Set([
  "CAUCA", "CHOCÓ", "CHOCO", "NARIÑO", "NARINO", "VALLE DEL CAUCA", "VALLE",
]);

function mapRow(r: Raw): Record<string, unknown> | null {
  const codigoDane = (r["codigo_dane"] as string)?.trim();
  const ano        = (r["a_o"] as string)?.trim();
  if (!codigoDane || !ano) return null;

  // Filtro client-side: descartar cualquier departamento fuera del Pacífico
  const depto = ((r["departamento"] as string) ?? "").toUpperCase().trim();
  if (!DEPTOS_PACIFICO.has(depto)) return null;

  return {
    a_o:             ano,
    codigo_dane:     codigoDane,
    nombre_estab:    (r["nombre_establecimiento"] as string) ?? null,
    departamento:    (r["departamento"] as string) ?? null,
    municipio:       (r["municipio"] as string) ?? null,
    codigo_municipio: (r["cod_dane_municipio"] as string) ?? null,
    sector:          (r["sector"] as string) ?? null,
    calendario:      (r["calendario"] as string) ?? null,
    total_matricula: parseSocrataNumber(r["total_matricula"] as string) != null
      ? Math.round(parseSocrataNumber(r["total_matricula"] as string)!)
      : null,
    cantidad_sedes:  parseSocrataNumber(r["cantidad_sedes"] as string) != null
      ? Math.round(parseSocrataNumber(r["cantidad_sedes"] as string)!)
      : null,
    raw: r,
  };
}

async function fetchPage(offset: number): Promise<Raw[]> {
  const where = encodeURIComponent(WHERE);
  const order = encodeURIComponent("codigo_dane ASC, a_o ASC");
  const url = `${BASE}?$where=${where}&$order=${order}&$limit=${PAGE}&$offset=${offset}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

function log(msg: string) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  log("=".repeat(70));
  log("BRÚJULA — ingest:educacion (uuid PK, ON CONFLICT DO NOTHING)");
  log(`Dataset: ${DATASET}  |  Máx. páginas: ${MAX_PAGES}  |  Batch: ${BATCH}`);
  log("=".repeat(70));

  // Inspect: mostrar columnas del primer registro real
  log("\n▶ Inspect columnas disponibles:");
  try {
    const sample = await fetchPage(0);
    if (sample.length > 0) {
      log(`  Claves: ${Object.keys(sample[0]).join(", ")}`);
      log(`  Ejemplo departamento: ${sample[0]["departamento"]}, a_o: ${sample[0]["a_o"]}`);
    }
  } catch (e) {
    log(`  WARN inspect: ${e}`);
  }
  log("");

  const stats = {
    descargados: 0, filtrados: 0, insertados: 0, errores: 0,
    porDepto: {} as Record<string, number>,
    porAno: {} as Record<string, number>,
  };

  for (let page = 0; page < MAX_PAGES; page++) {
    const offset = page * PAGE;
    log(`Página ${page + 1}/${MAX_PAGES}  (offset ${offset})...`);

    let batch: Raw[];
    try {
      batch = await fetchPage(offset);
    } catch (e) {
      log(`  WARN descarga: ${e}`);
      stats.errores++;
      await sleep(SLEEP_MS * 4);
      continue;
    }

    log(`  Descargados: ${batch.length}`);
    stats.descargados += batch.length;
    if (batch.length === 0) { log("  Fin."); break; }

    // Mapear + filtro client-side
    const mapped = batch
      .map(mapRow)
      .filter((r): r is NonNullable<typeof r> => r !== null);

    stats.filtrados += batch.length - mapped.length;

    // Deduplicar dentro del batch por (codigo_dane, a_o) para evitar
    // "ON CONFLICT command cannot affect row a second time"
    const seen = new Map<string, typeof mapped[number]>();
    for (const r of mapped) {
      const key = `${r.codigo_dane as string}||${r.a_o as string}`;
      if (!seen.has(key)) seen.set(key, r);
    }
    const deduped = [...seen.values()];

    for (const r of deduped) {
      const dep = (r.departamento as string) ?? "DESCONOCIDO";
      stats.porDepto[dep] = (stats.porDepto[dep] ?? 0) + 1;
      const ano = (r.a_o as string) ?? "?";
      stats.porAno[ano] = (stats.porAno[ano] ?? 0) + 1;
    }

    // Insertar en batches de BATCH; ignorar si ya existe (codigo_dane, a_o)
    for (let i = 0; i < deduped.length; i += BATCH) {
      const chunk = deduped.slice(i, i + BATCH);
      const { error } = await supabase
        .from("educacion_establecimientos")
        .upsert(chunk, { onConflict: "codigo_dane,a_o", ignoreDuplicates: true });
      if (error) {
        log(`  WARN upsert: ${error.message}`);
        stats.errores++;
      } else {
        stats.insertados += chunk.length;
      }
    }

    log(`  Insertados acumulado: ${stats.insertados}`);
    if (batch.length < PAGE) { log("  Última página."); break; }
    await sleep(SLEEP_MS);
  }

  log("");
  log("=".repeat(70));
  log("RESUMEN FINAL");
  log("=".repeat(70));
  const fmt = (n: number) => new Intl.NumberFormat("es-CO").format(n);
  log(`✓ Descargados         : ${fmt(stats.descargados)}`);
  log(`✓ Filtrados (foráneos): ${fmt(stats.filtrados)}`);
  log(`✓ Insertados          : ${fmt(stats.insertados)}`);
  if (stats.errores > 0) log(`⚠ Errores             : ${stats.errores}`);
  log("\nPor departamento:");
  for (const [dep, n] of Object.entries(stats.porDepto).sort(([,a],[,b]) => b - a)) {
    log(`  ${dep.padEnd(25)} ${fmt(n)}`);
  }
  log("\nPor año:");
  for (const [ano, n] of Object.entries(stats.porAno).sort()) {
    log(`  ${ano.padEnd(10)} ${fmt(n)}`);
  }
  log("\n✓ ingest:educacion completado. Siguiente: npm run ingest:sisben");
}

main().catch(e => { console.error("FATAL:", e); process.exit(1); });
