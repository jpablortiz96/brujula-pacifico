#!/usr/bin/env tsx
/**
 * inspect-datasets.ts
 * Lee el schema real de los 3 datasets nuevos de datos.gov.co.
 */

const BASE = "https://www.datos.gov.co/resource";

const DATASETS = [
  { id: "cfw5-qzt5", label: "Establecimientos educativos MEN" },
  { id: "hq2v-5umk", label: "Sisbén Personas DNP" },
  { id: "2kpj-cktv", label: "Lesiones fatales — Medicina Legal" },
];

const GEO_KEYS = [
  "municipio", "departamento", "ciudad", "codigo", "divipola",
  "dane", "depto", "mpio", "codigo_municipio", "cod_dane", "cod_mpio",
  "cod_depto", "c_digo", "c_digo_dane",
];

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function fetchRecords(
  datasetId: string,
  params: Record<string, string> = {},
  n = 5
): Promise<Record<string, unknown>[]> {
  const p = new URLSearchParams({ ...params, $limit: String(n) });
  const url = `${BASE}/${datasetId}.json?${p}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

function geoKeys(keys: string[]) {
  return keys.filter(k => GEO_KEYS.some(g => k.toLowerCase().includes(g)));
}

async function inspectDataset(id: string, label: string) {
  console.log("\n" + "=".repeat(72));
  console.log(`DATASET: ${label}`);
  console.log(`ID     : ${id}`);
  console.log(`URL    : https://www.datos.gov.co/resource/${id}.json`);
  console.log("=".repeat(72));

  // --- Sin filtro: ver columnas disponibles ---
  let rawUnfiltered: Record<string, unknown>[] = [];
  try {
    rawUnfiltered = await fetchRecords(id, {}, 5);
  } catch (e) {
    console.error(`  ERROR al obtener datos sin filtro: ${e}`);
    return;
  }

  if (!rawUnfiltered.length) {
    console.log("  Sin resultados sin filtro. Dataset vacío o inaccesible.");
    return;
  }

  const allKeys = [...new Set(rawUnfiltered.flatMap(r => Object.keys(r)))].sort();
  const geo = geoKeys(allKeys);

  console.log(`\n📋 Total columnas: ${allKeys.length}`);
  console.log("\n📋 Todas las columnas (alfabético):");
  for (let i = 0; i < allKeys.length; i += 4) {
    const row = allKeys.slice(i, i + 4).map(k => k.padEnd(28)).join("");
    console.log("  " + row);
  }

  console.log("\n🌎 Columnas geográficas detectadas:");
  if (geo.length === 0) {
    console.log("  (ninguna detectada)");
  } else {
    for (const k of geo) {
      const samples = rawUnfiltered
        .map(r => r[k])
        .filter(v => v != null)
        .slice(0, 3)
        .map(v => JSON.stringify(v));
      console.log(`  ${k.padEnd(30)} → ${samples.join(" | ")}`);
    }
  }

  // --- Intentar filtro por Pacífico (muestra con cada departamento) ---
  console.log("\n🔍 Probando filtros geográficos:");
  const DEPT_FILTERS = [
    { label: "Valle del Cauca (nombre)", where: `upper(departamento) like '%VALLE%'` },
    { label: "Chocó (nombre)",           where: `upper(departamento) like '%CHOC%'` },
    { label: "Nariño (nombre)",           where: `upper(departamento) like '%NARI%'` },
    { label: "Cauca (nombre)",            where: `upper(departamento) = 'CAUCA'` },
    { label: "Valle código 76",           where: `departamento = '76'` },
    { label: "Chocó código 27",           where: `departamento = '27'` },
    { label: "cod_depto = 76",            where: `cod_depto = '76'` },
    { label: "c_digo_departamento = 76",  where: `c_digo_departamento = '76'` },
  ];

  let filterWorked = "";
  for (const { label: flabel, where } of DEPT_FILTERS) {
    try {
      const rows = await fetchRecords(id, { $where: where }, 3);
      if (rows.length > 0) {
        console.log(`  ✓ Filtro funcionó: ${flabel} → ${rows.length} registros`);
        filterWorked = where;
        // Muestra valores geo de la primera fila con este filtro
        if (geo.length > 0) {
          const r = rows[0];
          for (const k of geo) {
            if (r[k] != null) console.log(`    ${k} = ${JSON.stringify(r[k])}`);
          }
        }
        break;
      }
    } catch { /* continuar */ }
    await sleep(200);
  }
  if (!filterWorked) {
    console.log("  ⚠ Ningún filtro geográfico conocido devolvió resultados.");
    console.log("    Verifica los nombres de columna en el registro completo de abajo.");
  }

  // --- Primer registro completo ---
  console.log("\n📄 Primer registro completo (sin filtro):");
  console.log(JSON.stringify(rawUnfiltered[0], null, 2));

  await sleep(500);
}

async function main() {
  console.log("BRÚJULA — inspect:datasets");
  console.log("Lectura de schema real de los 3 datasets nuevos\n");

  for (const { id, label } of DATASETS) {
    await inspectDataset(id, label);
  }

  console.log("\n" + "=".repeat(72));
  console.log("✓ inspect:datasets completado.");
  console.log("  Revisa los nombres de columna reales antes de crear los scripts de ingesta.");
}

main().catch(e => { console.error("FATAL:", e); process.exit(1); });

export {};
