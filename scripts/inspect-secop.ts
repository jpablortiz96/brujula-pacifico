#!/usr/bin/env tsx
/**
 * inspect-secop.ts
 * Muestra el schema real del endpoint SECOP II en datos.gov.co
 */

const DATASET  = "jbjy-vk9h";
const BASE     = `https://www.datos.gov.co/resource/${DATASET}.json`;
const WHERE    = encodeURIComponent("upper(departamento) = 'VALLE DEL CAUCA'");
const ENDPOINT = `${BASE}?$where=${WHERE}&$limit=3`;

async function fetchRows(url: string): Promise<Record<string, unknown>[]> {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

async function main() {
  console.log("=".repeat(70));
  console.log("BRÚJULA — inspect-secop: schema real de SECOP II");
  console.log(`Base: ${BASE}`);
  console.log("=".repeat(70));
  console.log(`\nFetch: ${ENDPOINT}\n`);

  let rows = await fetchRows(ENDPOINT);

  if (rows.length === 0) {
    console.log("Sin resultados con filtro Valle. Probando sin filtro...");
    rows = await fetchRows(`${BASE}?$limit=3`);
    if (rows.length === 0) { console.log("Dataset vacío o inaccesible."); process.exit(1); }
  }

  console.log(`Registros recibidos: ${rows.length}\n`);

  // ── Todas las claves del primer registro, ordenadas ──────────────────────
  const allKeys = Object.keys(rows[0]).sort();
  console.log(`─── TODAS LAS CLAVES (${allKeys.length}) ───────────────────────────────`);
  allKeys.forEach((k) => console.log(`  ${k}`));

  // ── Claves de interés con valores de muestra ─────────────────────────────
  const patterns = ["fecha", "municipio", "codigo", "ciudad", "valor", "contrato", "estado", "tipo"];

  console.log("\n─── CLAVES DE INTERÉS + VALORES MUESTRA ───────────────────────────────");
  for (const pattern of patterns) {
    const matching = allKeys.filter((k) => k.toLowerCase().includes(pattern));
    if (matching.length === 0) continue;
    console.log(`\n  [${pattern.toUpperCase()}]`);
    for (const key of matching) {
      const vals = rows.map((r) => String(r[key] ?? "(null)").slice(0, 35));
      console.log(`    ${key.padEnd(45)} | ${vals.join(" | ")}`);
    }
  }

  // ── Primer registro completo ─────────────────────────────────────────────
  console.log("\n─── PRIMER REGISTRO COMPLETO (raw JSON) ────────────────────────────────");
  console.log(JSON.stringify(rows[0], null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });

export {};
