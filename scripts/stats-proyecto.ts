#!/usr/bin/env tsx
/**
 * stats-proyecto.ts — fuente de verdad de los números del proyecto.
 * Para la landing, el README y toda referencia numérica.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { SECTORES } from "../lib/clasificacion/sectores";

for (const line of readFileSync(".env.local", "utf-8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i < 0) continue;
  const k = t.slice(0, i).trim();
  const v = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  if (k && !(k in process.env)) process.env[k] = v;
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const fmt = (n: number) => new Intl.NumberFormat("es-CO").format(n);
const cnt = async (build: () => { then: unknown }): Promise<number> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = (await build()) as any;
  return count ?? 0;
};

async function main() {
  console.log("=".repeat(64));
  console.log("BRÚJULA — stats del proyecto (fuente de verdad)");
  console.log("=".repeat(64));

  // Municipios (resuelve 178 vs 179)
  const municipios = await cnt(() => sb.from("municipios").select("*", { count: "exact", head: true }));

  // SECOP
  const secopTotal = await cnt(() => sb.from("secop_contratos").select("*", { count: "exact", head: true }));
  const secopConCod = await cnt(() => sb.from("secop_contratos").select("*", { count: "exact", head: true }).not("codigo_municipio", "is", null));
  const secopSinSector = await cnt(() => sb.from("secop_contratos").select("*", { count: "exact", head: true }).is("sector_inferido", null));
  const { data: minF } = await sb.from("secop_contratos").select("fecha_firma").not("fecha_firma", "is", null).order("fecha_firma", { ascending: true }).limit(1);
  const { data: maxF } = await sb.from("secop_contratos").select("fecha_firma").not("fecha_firma", "is", null).order("fecha_firma", { ascending: false }).limit(1);

  // KPIs (valor total + municipios cubiertos)
  const { data: kpi } = await sb.rpc("brujula_kpis", { p_departamento: null, p_fecha_inicio: null, p_fecha_fin: null, p_valor_min: null, p_valor_max: null, p_busqueda: null });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const k = ((kpi as any[]) ?? [])[0] ?? {};

  // Otras tablas
  const sisben = await cnt(() => sb.from("sisben_personas").select("*", { count: "exact", head: true }));
  const educacion = await cnt(() => sb.from("educacion_establecimientos").select("*", { count: "exact", head: true }));
  const medicina = await cnt(() => sb.from("medicina_lesiones").select("*", { count: "exact", head: true }));

  // Sectores con contratos
  let sectoresConDatos = 0;
  for (const s of SECTORES) {
    const n = await cnt(() => sb.from("secop_contratos").select("*", { count: "exact", head: true }).eq("sector_inferido", s));
    if (n > 0) sectoresConDatos++;
  }

  // Municipios con >=1 contrato
  const { data: porMuni } = await sb.rpc("brujula_contratos_por_municipio");
  const muniConContrato = Array.isArray(porMuni) ? porMuni.length : 0;

  // Municipios por departamento
  const deptos: Record<string, string> = { "19": "Cauca", "27": "Chocó", "52": "Nariño", "76": "Valle del Cauca" };
  const porDepto: Record<string, number> = {};
  for (const pref of Object.keys(deptos)) {
    porDepto[deptos[pref]] = await cnt(() => sb.from("municipios").select("*", { count: "exact", head: true }).like("divipola", `${pref}%`));
  }

  console.log(`\nMunicipios (tabla municipios) : ${municipios}`);
  console.log(`  por departamento:`);
  for (const [d, n] of Object.entries(porDepto)) console.log(`    ${d.padEnd(18)} ${n}`);

  console.log(`\nSECOP contratos               : ${fmt(secopTotal)}`);
  console.log(`  con codigo_municipio         : ${fmt(secopConCod)} (${((100 * secopConCod) / secopTotal).toFixed(1)}%)`);
  console.log(`  sin sector_inferido (NULL)   : ${fmt(secopSinSector)}`);
  console.log(`  rango fecha_firma            : ${minF?.[0]?.fecha_firma} → ${maxF?.[0]?.fecha_firma}`);
  console.log(`  valor total (kpis)           : $${fmt(Number(k.valor_total_cop ?? 0))} COP`);
  console.log(`  municipios cubiertos (kpis)  : ${k.municipios_cubiertos ?? "?"}`);
  console.log(`  municipios con >=1 contrato  : ${muniConContrato}`);
  console.log(`  entidades distintas          : ${fmt(Number(k.entidades_distintas ?? 0))}`);
  console.log(`  sectores con contratos       : ${sectoresConDatos} de ${SECTORES.length}`);

  console.log(`\nSisbén personas               : ${fmt(sisben)}`);
  console.log(`Educación establecimientos    : ${fmt(educacion)}`);
  console.log(`Medicina Legal lesiones       : ${fmt(medicina)}`);

  const valorBillones = (Number(k.valor_total_cop ?? 0) / 1e12).toFixed(1);
  console.log(`\n→ Para landing: ${fmt(secopTotal)} contratos · 4 datasets · ${municipios} municipios · $${valorBillones} billones · datos a ${maxF?.[0]?.fecha_firma}`);
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });

export {};
