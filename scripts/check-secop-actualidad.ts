#!/usr/bin/env tsx
/**
 * check-secop-actualidad.ts
 * ¿Cuántos contratos NUEVOS del Pacífico hay en la fuente (Socrata) desde
 * la última fecha ingerida? Solo lee la API pública.
 */

const DATASET = "jbjy-vk9h";
const BASE = `https://www.datos.gov.co/resource/${DATASET}.json`;
const DEPTO_FILTER =
  "upper(departamento) in ('CAUCA','CHOCÓ','CHOCO','NARIÑO','NARINO','VALLE DEL CAUCA','VALLE')";
const CORTE = "2025-05-06"; // última fecha ingerida hoy

const fmt = (n: number) => new Intl.NumberFormat("es-CO").format(n);

async function soql(params: string): Promise<unknown[]> {
  const url = `${BASE}?${params}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

async function main() {
  console.log("=".repeat(72));
  console.log("BRÚJULA — check:secop-actualidad");
  console.log("=".repeat(72));

  // Fecha máxima global
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const maxGlobal = (await soql(`$select=max(fecha_de_firma)`)) as any[];
  console.log(`\nFecha máxima en el dataset (global): ${maxGlobal?.[0]?.max_fecha_de_firma ?? "?"}`);

  // Fecha máxima Pacífico
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const maxPac = (await soql(`$select=max(fecha_de_firma)&$where=${encodeURIComponent(DEPTO_FILTER)}`)) as any[];
  console.log(`Fecha máxima Pacífico               : ${maxPac?.[0]?.max_fecha_de_firma ?? "?"}`);

  // Total Pacífico
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totPac = (await soql(`$select=count(*)&$where=${encodeURIComponent(DEPTO_FILTER)}`)) as any[];
  console.log(`Total contratos Pacífico (fuente)   : ${fmt(Number(totPac?.[0]?.count ?? 0))}`);

  // Nuevos desde el corte
  const whereNuevos = `${DEPTO_FILTER} AND fecha_de_firma > '${CORTE}T23:59:59'`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nuevos = (await soql(`$select=count(*)&$where=${encodeURIComponent(whereNuevos)}`)) as any[];
  const nNuevos = Number(nuevos?.[0]?.count ?? 0);
  console.log(`\nContratos Pacífico con fecha > ${CORTE}: ${fmt(nNuevos)}  ← NUEVOS a ingerir`);

  // Desglose por año de los nuevos (2025, 2026)
  for (const anio of [2025, 2026]) {
    const w = `${DEPTO_FILTER} AND fecha_de_firma >= '${anio}-01-01' AND fecha_de_firma <= '${anio}-12-31T23:59:59'`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = (await soql(`$select=count(*)&$where=${encodeURIComponent(w)}`)) as any[];
    console.log(`  ${anio} (Pacífico, fuente completa): ${fmt(Number(r?.[0]?.count ?? 0))}`);
  }

  console.log("\n✓ check completado.");
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});

export {};
