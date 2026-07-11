#!/usr/bin/env tsx
/**
 * validate-data.ts
 * Reporte de validación end-to-end con paginación correcta.
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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("ERROR: Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function log(msg: string) { console.log(msg); }
function sep(char = "─", n = 70) { log(char.repeat(n)); }
function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(n);
}
function pct(n: number, d: number) {
  return d > 0 ? ((n / d) * 100).toFixed(1) + "%" : "—";
}

/** Pagina todos los registros de una tabla con las columnas pedidas */
async function fetchAll<T extends Record<string, unknown>>(
  table: string,
  columns: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filter?: (q: any) => any
): Promise<T[]> {
  const PAGE = 1000;
  const all: T[] = [];
  let offset = 0;
  while (true) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = sb.from(table).select(columns).range(offset, offset + PAGE - 1);
    if (filter) q = filter(q);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    all.push(...(data as unknown as T[]));
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return all;
}

async function main() {
  log("=".repeat(70));
  log("BRÚJULA — validate:data");
  log("=".repeat(70));

  // ── Q1: Cobertura global ──────────────────────────────────────────────────
  log("\n📊 Q1 — Cobertura global de secop_contratos");
  sep();

  const { count: total }        = await sb.from("secop_contratos").select("*", { count: "exact", head: true });
  const { count: conFecha }     = await sb.from("secop_contratos").select("*", { count: "exact", head: true }).not("fecha_firma", "is", null);
  const { count: conMuni }      = await sb.from("secop_contratos").select("*", { count: "exact", head: true }).not("codigo_municipio", "is", null);
  const { count: conCiudad }    = await sb.from("secop_contratos").select("*", { count: "exact", head: true }).not("ciudad", "is", null);
  const { count: sinFecha }     = await sb.from("secop_contratos").select("*", { count: "exact", head: true }).is("fecha_firma", null);

  const { data: minRow } = await sb.from("secop_contratos").select("fecha_firma").not("fecha_firma","is",null).order("fecha_firma", { ascending: true  }).limit(1);
  const { data: maxRow } = await sb.from("secop_contratos").select("fecha_firma").not("fecha_firma","is",null).order("fecha_firma", { ascending: false }).limit(1);

  log(`  Total contratos     : ${fmt(total)}`);
  log(`  Con fecha_firma     : ${fmt(conFecha)}  (${pct(conFecha ?? 0, total ?? 1)})`);
  log(`  Con ciudad          : ${fmt(conCiudad)}  (${pct(conCiudad ?? 0, total ?? 1)})`);
  log(`  Con codigo_municipio: ${fmt(conMuni)}  (${pct(conMuni ?? 0, total ?? 1)})`);
  log(`  SIN fecha_firma     : ${fmt(sinFecha)}  ← registros a limpiar si > 0`);
  log(`  Fecha más antigua   : ${minRow?.[0]?.fecha_firma ?? "—"}`);
  log(`  Fecha más reciente  : ${maxRow?.[0]?.fecha_firma ?? "—"}`);

  if ((sinFecha ?? 0) > 0) {
    log(`\n  ⚠ HAY ${fmt(sinFecha)} contratos sin fecha_firma.`);
    log(`    Ejecuta en Supabase SQL Editor:`);
    log(`    DELETE FROM secop_contratos WHERE fecha_firma IS NULL;`);
    log(`    Luego vuelve a correr: npm run validate`);
  }

  // ── Q2: Por departamento (paginado) ──────────────────────────────────────
  log("\n📊 Q2 — Contratos por departamento");
  sep();

  const depRows = await fetchAll<{ departamento: string; valor_contrato: string | null }>(
    "secop_contratos", "departamento,valor_contrato"
  );

  const depStats: Record<string, { n: number; valor: number }> = {};
  for (const r of depRows) {
    const dep = r.departamento ?? "DESCONOCIDO";
    if (!depStats[dep]) depStats[dep] = { n: 0, valor: 0 };
    depStats[dep].n++;
    depStats[dep].valor += parseFloat(r.valor_contrato ?? "0") || 0;
  }

  log(`  ${"Departamento".padEnd(28)} ${"Contratos".padStart(10)} ${"Miles mill COP".padStart(16)}`);
  sep("─", 56);
  for (const [dep, s] of Object.entries(depStats).sort(([,a],[,b]) => b.n - a.n)) {
    log(`  ${dep.padEnd(28)} ${fmt(s.n).padStart(10)} ${(s.valor / 1e9).toFixed(2).padStart(16)}`);
  }

  // ── Q3: Top 15 municipios (paginado) ────────────────────────────────────
  log("\n📊 Q3 — Top 15 municipios por contratos SECOP");
  sep();

  const [municipios, contratos] = await Promise.all([
    fetchAll<{ divipola: string; nombre: string; departamento: string }>(
      "municipios", "divipola,nombre,departamento"
    ),
    fetchAll<{ codigo_municipio: string | null; valor_contrato: string | null }>(
      "secop_contratos", "codigo_municipio,valor_contrato",
      (q) => q.not("codigo_municipio", "is", null)
    ),
  ]);

  const muniIndex: Record<string, { nombre: string; depto: string; n: number; valor: number }> = {};
  for (const m of municipios) {
    muniIndex[m.divipola] = { nombre: m.nombre, depto: m.departamento, n: 0, valor: 0 };
  }
  for (const c of contratos) {
    if (c.codigo_municipio && muniIndex[c.codigo_municipio]) {
      muniIndex[c.codigo_municipio].n++;
      muniIndex[c.codigo_municipio].valor += parseFloat(c.valor_contrato ?? "0") || 0;
    }
  }

  const top15 = Object.values(muniIndex).sort((a, b) => b.n - a.n).slice(0, 15);
  log(`  ${"Municipio".padEnd(24)} ${"Depto".padEnd(22)} ${"Contratos".padStart(10)} ${"Miles mill COP".padStart(15)}`);
  sep("─", 73);
  for (const m of top15) {
    log(`  ${m.nombre.padEnd(24)} ${m.depto.padEnd(22)} ${fmt(m.n).padStart(10)} ${(m.valor/1e9).toFixed(2).padStart(15)}`);
  }

  // ── Q4: Catálogo de municipios ────────────────────────────────────────────
  log("\n📊 Q4 — Municipios en catálogo");
  sep();

  const { count: totalMunis } = await sb.from("municipios").select("*", { count: "exact", head: true });
  const muniByDepto = await fetchAll<{ codigo_depto: string; departamento: string }>("municipios", "codigo_depto,departamento");

  const mdCounts: Record<string, { depto: string; n: number }> = {};
  for (const r of muniByDepto) {
    const k = r.codigo_depto;
    if (!mdCounts[k]) mdCounts[k] = { depto: r.departamento, n: 0 };
    mdCounts[k].n++;
  }

  log(`  Total municipios    : ${fmt(totalMunis)}`);
  for (const [cod, { depto, n }] of Object.entries(mdCounts).sort()) {
    log(`  ${cod} — ${depto.padEnd(20)} ${n} municipios`);
  }

  // ── Q5: Cobertura por dataset adicional ──────────────────────────────────
  log("\n📊 Q5 — Cobertura de datasets adicionales");
  sep();

  const datasets: Array<{ label: string; table: string }> = [
    { label: "educacion_establecimientos", table: "educacion_establecimientos" },
    { label: "sisben_personas",            table: "sisben_personas"            },
    { label: "medicina_lesiones",          table: "medicina_lesiones"          },
  ];

  for (const ds of datasets) {
    const { count: dsTotal } = await sb.from(ds.table).select("*", { count: "exact", head: true });
    log(`  ${ds.label.padEnd(34)}: ${fmt(dsTotal)} registros`);
  }

  // ── Q6: Cobertura DIVIPOLA por dataset ───────────────────────────────────
  log("\n📊 Q6 — % cobertura DIVIPOLA por dataset");
  sep();

  for (const ds of datasets) {
    const { count: dsTotal } = await sb.from(ds.table).select("*", { count: "exact", head: true });
    const { count: dsMuni }  = await sb
      .from(ds.table).select("*", { count: "exact", head: true })
      .not("codigo_municipio", "is", null);
    log(`  ${ds.label.padEnd(34)}: ${fmt(dsMuni)} / ${fmt(dsTotal)}  (${pct(dsMuni ?? 0, dsTotal ?? 1)})`);
  }

  // ── Q7: Indicadores por municipio (Tumaco, Cali, Quibdó) ─────────────────
  log("\n📊 Q7 — brujula_indicadores_municipio");
  sep();

  const ciudades = [
    { divipola: "52835", nombre: "Tumaco"  },
    { divipola: "76001", nombre: "Cali"    },
    { divipola: "27001", nombre: "Quibdó"  },
    { divipola: "19001", nombre: "Popayán" },
  ];

  for (const c of ciudades) {
    const { data: ind, error: indErr } = await sb.rpc(
      "brujula_indicadores_municipio",
      { p_divipola: c.divipola }
    );

    if (indErr) {
      log(`  ${c.nombre} (${c.divipola}): ERROR — ${indErr.message}`);
      log(`    ↳ Asegúrate de haber ejecutado supabase/functions-cruzadas.sql`);
      continue;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r: any = Array.isArray(ind) ? (ind as any[])[0] : ind;
    log(`\n  ${c.nombre} (${c.divipola})`);
    log(`    Contratos SECOP  : ${fmt(r?.contratos)}  (${(Number(r?.valor_contratos ?? 0) / 1e9).toFixed(2)} MM COP)`);
    log(`    Estab. educativos: ${fmt(r?.estab_total)} total, ${fmt(r?.estab_oficial)} oficiales, ${fmt(r?.matricula_total)} matriculados`);
    log(`    Sisbén           : ${fmt(r?.sisben_registros)} registros, ${fmt(r?.sisben_vulnerables)} vulnerables (A/B)`);
    log(`    Medicina Legal   : ${fmt(r?.muertes_total)} muertes, ${fmt(r?.homicidios)} homicidios`);
  }

  // ── Q8: Zonas olvidadas v2 ───────────────────────────────────────────────
  log("\n📊 Q8 — brujula_zonas_olvidadas_v4 (top 10)");
  sep();

  const { data: zonas, error: zonasErr } = await sb.rpc("brujula_zonas_olvidadas_v4");

  if (zonasErr) {
    log(`  ERROR — ${zonasErr.message}`);
    log(`  ↳ Asegúrate de haber ejecutado supabase/functions-zonas-olvidadas-v4.sql`);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const top10 = ((zonas as any[]) ?? []).slice(0, 10);
    log(`  ${"Municipio".padEnd(24)} ${"Depto".padEnd(22)} ${"Contratos".padStart(10)} ${"% Vuln".padStart(7)} ${"Score".padStart(6)} ${"Categoría".padEnd(18)}`);
    sep("─", 92);
    for (const z of top10) {
      log(
        `  ${String(z.nombre ?? "").padEnd(24)}` +
        ` ${String(z.departamento ?? "").padEnd(22)}` +
        ` ${fmt(z.contratos).padStart(10)}` +
        ` ${String(z.pct_vulnerable ?? 0).padStart(6)}%` +
        ` ${String(z.score_olvido ?? 0).padStart(6)}` +
        ` ${String(z.categoria ?? "").padEnd(18)}`
      );
    }
  }

  // ── Veredicto ─────────────────────────────────────────────────────────────
  log("");
  log("=".repeat(70));
  log("✅ CRITERIOS DE ÉXITO");
  sep("─");

  const pctFecha = pct(conFecha ?? 0, total ?? 1);
  const pctMuni  = pct(conMuni  ?? 0, total ?? 1);
  const pctFechaNum = total ? (conFecha ?? 0) / total * 100 : 0;
  const pctMuniNum  = total ? (conMuni  ?? 0) / total * 100 : 0;

  log(`  pct_fecha > 90%   : ${pctFechaNum >= 90 ? "✓ CUMPLE" : "✗ NO cumple"}  (${pctFecha})`);
  log(`  pct_muni  > 70%   : ${pctMuniNum  >= 70 ? "✓ CUMPLE" : "✗ NO cumple"}  (${pctMuni})`);
  log(`  Municipios ≥ 170  : ${(totalMunis ?? 0) >= 170 ? "✓ CUMPLE" : "✗ NO cumple"}  (${totalMunis})`);

  if ((sinFecha ?? 0) > 0) {
    log(`\n  ↳ Si limpias los ${fmt(sinFecha)} sin fecha:`);
    log(`      pct_fecha proyectado → ${pct(conFecha ?? 0, (total ?? 1) - (sinFecha ?? 0))}`);
    log(`      pct_muni  proyectado → ${pct(conMuni  ?? 0, (total ?? 1) - (sinFecha ?? 0))}`);
  }

  log("");
  log("✓ validate:data completado.");
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
