#!/usr/bin/env tsx
/**
 * enrich-sisben-poblacion.ts
 * Calcula la población Sisbén EXPANDIDA autoritativa por municipio usando
 * sum(fex) sobre el dataset COMPLETO de datos.gov.co (hq2v-5umk), y la guarda
 * en municipios.sisben_pob_total / sisben_pob_vulnerable.
 *
 * Por qué NO usamos sisben_personas: esa tabla está capada a 400 registros por
 * municipio (para balancear el ranking), así que su sum(fex) subestima la
 * población 5-20× de forma no uniforme. El denominador per cápita debe venir
 * del universo completo publicado → agregación server-side en Socrata.
 *
 * 📋 ACCIÓN MANUAL PREVIA: ejecutar supabase/alter-municipios-sisben-poblacion.sql
 *
 * Solo lee Socrata y actualiza municipios. No toca sisben_personas.
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
} catch {
  /* vars del sistema */
}

const DATASET = "hq2v-5umk";
const BASE = `https://www.datos.gov.co/resource/${DATASET}.json`;
const DEPTOS = ["19", "27", "52", "76"];

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const fmt = (n: number) => new Intl.NumberFormat("es-CO").format(Math.round(n));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface AggRow {
  cod_mpio: string;
  sum_fex: string;
}

/** sum(fex) agrupado por cod_mpio, con filtro opcional extra (grupo A/B). */
async function sumFexPorMunicipio(prefijo: string, soloVulnerable: boolean): Promise<Map<string, number>> {
  const cond = [`starts_with(cod_mpio, '${prefijo}')`];
  if (soloVulnerable) cond.push("grupo in ('A','B')");
  const select = encodeURIComponent("cod_mpio, sum(fex)");
  const group = encodeURIComponent("cod_mpio");
  const where = encodeURIComponent(cond.join(" AND "));
  const url = `${BASE}?$select=${select}&$group=${group}&$where=${where}&$limit=1000`;

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const rows = (await res.json()) as AggRow[];

  const map = new Map<string, number>();
  for (const r of rows) {
    const cod = String(r.cod_mpio ?? "").trim();
    const val = Number(r.sum_fex ?? 0);
    if (cod && Number.isFinite(val)) map.set(cod, val);
  }
  return map;
}

async function main() {
  console.log("=".repeat(72));
  console.log("BRÚJULA — enrich:sisben-poblacion (población expandida autoritativa)");
  console.log("=".repeat(72));
  console.log("📋 Requiere: supabase/alter-municipios-sisben-poblacion.sql ejecutado.\n");

  const total = new Map<string, number>();
  const vuln = new Map<string, number>();

  for (const pref of DEPTOS) {
    console.log(`▶ Departamento ${pref}: agregando sum(fex)…`);
    const t = await sumFexPorMunicipio(pref, false);
    await sleep(300);
    const v = await sumFexPorMunicipio(pref, true);
    await sleep(300);
    for (const [k, val] of t) total.set(k, val);
    for (const [k, val] of v) vuln.set(k, val);
    console.log(`  ${t.size} municipios con población total, ${v.size} con vulnerable.`);
  }

  console.log(`\n▶ Actualizando tabla municipios (${total.size} municipios)…`);
  let ok = 0;
  let sinFila = 0;
  let errores = 0;

  for (const [cod, pobTotal] of total) {
    const pobVuln = vuln.get(cod) ?? 0;
    const { data, error } = await supabase
      .from("municipios")
      .update({
        sisben_pob_total: Math.round(pobTotal),
        sisben_pob_vulnerable: Math.round(pobVuln),
      })
      .eq("divipola", cod)
      .select("divipola");
    if (error) {
      console.log(`  ⚠️  ${cod}: ${error.message}`);
      errores++;
    } else if (!data || data.length === 0) {
      // cod_mpio del dataset que no está en la tabla municipios
      sinFila++;
    } else {
      ok++;
    }
  }

  console.log("\n" + "=".repeat(72));
  console.log("RESUMEN");
  console.log("=".repeat(72));
  console.log(`✓ Municipios actualizados        : ${ok}`);
  console.log(`· cod_mpio sin fila en municipios : ${sinFila}`);
  if (errores > 0) console.log(`⚠ Errores                         : ${errores}`);

  // Muestra de control
  const control = ["27150", "52835", "76001"];
  const nombres: Record<string, string> = { "27150": "Cértegui", "52835": "Tumaco", "76001": "Cali" };
  console.log("\nControl (población vulnerable expandida):");
  for (const cod of control) {
    console.log(`  ${nombres[cod].padEnd(12)} total=${fmt(total.get(cod) ?? 0).padStart(10)}  vulnerable=${fmt(vuln.get(cod) ?? 0).padStart(10)}`);
  }

  console.log("\n✓ enrich:sisben-poblacion completado. Siguiente: functions-zonas-olvidadas-v3.sql");
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});

export {};
