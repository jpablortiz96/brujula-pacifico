#!/usr/bin/env tsx
/**
 * ingest-medicina.ts
 * Ingesta lesiones fatales Medicina Legal (2kpj-cktv) para el Pacífico.
 *
 * Columnas reales confirmadas con inspect-datasets.ts:
 *   id, a_o_del_hecho, mes_del_hecho, codigo_dane_departamento,
 *   codigo_dane_municipio, departamento_del_hecho_dane,
 *   municipio_del_hecho_dane, sexo_de_la_victima,
 *   grupo_de_edad_de_la_victima, ciclo_vital, manera_de_muerte,
 *   mecanismo_causal, escenario_del_hecho, zona_del_hecho
 *
 * PK sintético: a_o_del_hecho + '-' + id
 * Filtro: codigo_dane_departamento in ('19','27','52','76')
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

const DATASET  = "2kpj-cktv";
const BASE     = `https://www.datos.gov.co/resource/${DATASET}.json`;
const PAGE     = 1000;
const SLEEP_MS = 400;

const MAX_PAGES = (() => {
  const i = process.argv.indexOf("--maxPages");
  return i !== -1 ? parseInt(process.argv[i + 1], 10) : 20;
})();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

// Filtro: departamentos del Pacífico por código DANE
const WHERE = "codigo_dane_departamento in ('19','27','52','76')";

type Raw = Record<string, unknown>;

function mapRow(r: Raw): Record<string, unknown> | null {
  const rowId = (r["id"] as string)?.trim();
  const año   = (r["a_o_del_hecho"] as string)?.trim();
  if (!rowId || !año) return null;

  const id = `${año}-${rowId}`;

  return {
    id,
    año_hecho:    año,
    mes_hecho:    (r["mes_del_hecho"] as string) ?? null,
    departamento: (r["departamento_del_hecho_dane"] as string) ?? null,
    municipio:    (r["municipio_del_hecho_dane"] as string) ?? null,
    codigo_municipio: (r["codigo_dane_municipio"] as string) ?? null,
    sexo:         (r["sexo_de_la_victima"] as string) ?? null,
    edad_grupo:   (r["grupo_de_edad_de_la_victima"] as string) ?? null,
    ciclo_vital:  (r["ciclo_vital"] as string) ?? null,
    manera:       (r["manera_de_muerte"] as string) ?? null,
    mecanismo:    (r["mecanismo_causal"] as string) ?? null,
    escenario:    (r["escenario_del_hecho"] as string) ?? null,
    zona:         (r["zona_del_hecho"] as string) ?? null,
    raw: r,
  };
}

async function fetchPage(offset: number): Promise<Raw[]> {
  const where = encodeURIComponent(WHERE);
  const order = encodeURIComponent("id ASC");
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
  log("BRÚJULA — ingest:medicina");
  log(`Dataset: ${DATASET}  |  Máx. páginas: ${MAX_PAGES}`);
  log("=".repeat(70));

  const stats = {
    descargados: 0, insertados: 0, errores: 0,
    porDepto: {} as Record<string, number>,
    porManera: {} as Record<string, number>,
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

    const mapped = batch.map(mapRow).filter((r): r is NonNullable<typeof r> => r !== null);

    for (const r of mapped) {
      const dep = (r.departamento as string) ?? "DESCONOCIDO";
      stats.porDepto[dep] = (stats.porDepto[dep] ?? 0) + 1;
      const man = (r.manera as string)?.slice(0, 35) ?? "DESCONOCIDA";
      stats.porManera[man] = (stats.porManera[man] ?? 0) + 1;
    }

    for (let i = 0; i < mapped.length; i += 500) {
      const chunk = mapped.slice(i, i + 500);
      const { error } = await supabase
        .from("medicina_lesiones")
        .upsert(chunk, { onConflict: "id" });
      if (error) { log(`  WARN upsert: ${error.message}`); stats.errores++; }
      else stats.insertados += chunk.length;
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
  log(`✓ Descargados  : ${fmt(stats.descargados)}`);
  log(`✓ Insertados   : ${fmt(stats.insertados)}`);
  if (stats.errores > 0) log(`⚠ Errores       : ${stats.errores}`);
  log("\nPor departamento:");
  for (const [dep, n] of Object.entries(stats.porDepto).sort(([,a],[,b]) => b - a)) {
    log(`  ${dep.padEnd(35)} ${fmt(n)}`);
  }
  log("\nPor manera de muerte:");
  for (const [man, n] of Object.entries(stats.porManera).sort(([,a],[,b]) => b - a)) {
    log(`  ${man.padEnd(35)} ${fmt(n)}`);
  }
  log("\n✓ ingest:medicina completado. Siguiente: npm run enrich:multi");
}

main().catch(e => { console.error("FATAL:", e); process.exit(1); });
