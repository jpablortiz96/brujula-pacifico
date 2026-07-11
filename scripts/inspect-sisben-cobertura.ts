#!/usr/bin/env tsx
/**
 * inspect-sisben-cobertura.ts
 * Inspecciona el UNIVERSO REAL de municipios en el dataset Sisbén (hq2v-5umk)
 * de datos.gov.co, agrupando por cod_mpio dentro de cada departamento del
 * Pacífico. Sirve para saber cuántos municipios distintos existen realmente
 * en el dataset publicado ANTES de re-ingestar con cuota por municipio.
 *
 * NO escribe en Supabase. Solo lee la API Socrata (agregación server-side).
 */

import { DIVIPOLA_PACIFICO } from "../lib/divipola/catalogo-pacifico";

const DATASET = "hq2v-5umk";
const BASE = `https://www.datos.gov.co/resource/${DATASET}.json`;

const DEPTOS = [
  { nombre: "Cauca", prefijo: "19" },
  { nombre: "Chocó", prefijo: "27" },
  { nombre: "Nariño", prefijo: "52" },
  { nombre: "Valle del Cauca", prefijo: "76" },
];

// Índice divipola → nombre desde el catálogo (para etiquetar los conteos).
const NOMBRE = new Map<string, string>();
for (const m of DIVIPOLA_PACIFICO) NOMBRE.set(m.divipola, m.nombre);

const fmt = (n: number) => new Intl.NumberFormat("es-CO").format(n);

interface GrupoCobertura {
  cod_mpio: string;
  count: string;
}

async function coberturaDepto(prefijo: string): Promise<{ cod: string; n: number }[]> {
  // Agregación server-side: count(*) agrupado por cod_mpio.
  const select = encodeURIComponent("cod_mpio, count(*)");
  const group = encodeURIComponent("cod_mpio");
  const where = encodeURIComponent(`starts_with(cod_mpio, '${prefijo}')`);
  const url = `${BASE}?$select=${select}&$group=${group}&$where=${where}&$limit=1000`;

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const rows = (await res.json()) as GrupoCobertura[];
  return rows
    .map((r) => ({ cod: String(r.cod_mpio ?? "").trim(), n: parseInt(r.count ?? "0", 10) }))
    .filter((r) => r.cod)
    .sort((a, b) => b.n - a.n);
}

async function main() {
  console.log("=".repeat(72));
  console.log("BRÚJULA — inspect:sisben-cobertura");
  console.log(`Universo real de municipios en el dataset Sisbén (${DATASET})`);
  console.log("=".repeat(72));

  let granTotalMpios = 0;
  let granTotalRegistros = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resumen: Record<string, { mpios: number; registros: number; muni: any[] }> = {};

  for (const { nombre, prefijo } of DEPTOS) {
    console.log(`\n${"─".repeat(72)}`);
    console.log(`▶ ${nombre} (cod_mpio empieza con '${prefijo}')`);
    console.log("─".repeat(72));

    let muni: { cod: string; n: number }[];
    try {
      muni = await coberturaDepto(prefijo);
    } catch (e) {
      console.log(`  ⚠️  Error consultando Socrata: ${e}`);
      continue;
    }

    const totalReg = muni.reduce((s, m) => s + m.n, 0);
    const totalCatalogo = DIVIPOLA_PACIFICO.filter((m) => m.codigo_depto === prefijo).length;

    console.log(
      `  Municipios distintos en el dataset : ${muni.length}  (de ${totalCatalogo} en el catálogo)`
    );
    console.log(`  Registros totales del depto        : ${fmt(totalReg)}`);
    console.log(`  Promedio por municipio con datos   : ${muni.length ? fmt(Math.round(totalReg / muni.length)) : 0}`);
    console.log(`\n  Detalle (cod → nombre → registros):`);
    for (const m of muni) {
      const nom = NOMBRE.get(m.cod) ?? "(no está en catálogo Pacífico)";
      console.log(`    ${m.cod}  ${nom.padEnd(30)} ${fmt(m.n).padStart(8)}`);
    }

    granTotalMpios += muni.length;
    granTotalRegistros += totalReg;
    resumen[nombre] = { mpios: muni.length, registros: totalReg, muni };
  }

  console.log(`\n${"=".repeat(72)}`);
  console.log("RESUMEN GLOBAL");
  console.log("=".repeat(72));
  for (const [dep, r] of Object.entries(resumen)) {
    console.log(`  ${dep.padEnd(20)} ${String(r.mpios).padStart(3)} municipios · ${fmt(r.registros).padStart(10)} registros`);
  }
  console.log("─".repeat(72));
  console.log(`  ${"TOTAL".padEnd(20)} ${String(granTotalMpios).padStart(3)} municipios · ${fmt(granTotalRegistros).padStart(10)} registros`);
  console.log(`\n  Catálogo Pacífico completo: ${DIVIPOLA_PACIFICO.length} municipios`);
  console.log("\n✓ inspect:sisben-cobertura completado. Revisa el universo real antes de re-ingestar.");
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});

export {};
