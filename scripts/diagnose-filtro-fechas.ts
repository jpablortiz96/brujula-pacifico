#!/usr/bin/env tsx
/**
 * diagnose-filtro-fechas.ts
 * Diagnostica el bug del filtro de período: ¿está en la RPC, el API o el
 * cálculo del preset? Solo lee.
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

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const fmt = (n: number) => new Intl.NumberFormat("es-CO").format(n);

async function countCali(desde: string, hasta: string): Promise<number> {
  const { count } = await sb
    .from("secop_contratos")
    .select("*", { count: "exact", head: true })
    .eq("codigo_municipio", "76001")
    .gte("fecha_firma", desde)
    .lte("fecha_firma", hasta);
  return count ?? 0;
}

async function main() {
  console.log("=".repeat(72));
  console.log("BRÚJULA — diagnose:filtro-fechas");
  console.log("=".repeat(72));

  // Tipo y ejemplo de fecha_firma
  const { data: muestra } = await sb
    .from("secop_contratos")
    .select("fecha_firma")
    .not("fecha_firma", "is", null)
    .limit(1);
  console.log(`\nEjemplo fecha_firma: ${JSON.stringify(muestra?.[0]?.fecha_firma)} (typeof ${typeof muestra?.[0]?.fecha_firma})`);

  // min / max / count
  const { data: minRow } = await sb.from("secop_contratos").select("fecha_firma").not("fecha_firma", "is", null).order("fecha_firma", { ascending: true }).limit(1);
  const { data: maxRow } = await sb.from("secop_contratos").select("fecha_firma").not("fecha_firma", "is", null).order("fecha_firma", { ascending: false }).limit(1);
  const { count: total } = await sb.from("secop_contratos").select("*", { count: "exact", head: true });
  const { count: nulos } = await sb.from("secop_contratos").select("*", { count: "exact", head: true }).is("fecha_firma", null);
  console.log(`min(fecha_firma): ${minRow?.[0]?.fecha_firma}`);
  console.log(`max(fecha_firma): ${maxRow?.[0]?.fecha_firma}`);
  console.log(`total contratos : ${fmt(total ?? 0)}  |  con fecha_firma NULL: ${fmt(nulos ?? 0)}`);

  // Cali por año
  console.log(`\nCali (76001) por año:`);
  const { count: caliTotal } = await sb.from("secop_contratos").select("*", { count: "exact", head: true }).eq("codigo_municipio", "76001");
  const { count: caliNull } = await sb.from("secop_contratos").select("*", { count: "exact", head: true }).eq("codigo_municipio", "76001").is("fecha_firma", null);
  console.log(`  total Cali: ${fmt(caliTotal ?? 0)}  |  Cali con fecha NULL: ${fmt(caliNull ?? 0)}`);
  for (let anio = 2016; anio <= 2026; anio++) {
    const n = await countCali(`${anio}-01-01`, `${anio}-12-31`);
    if (n > 0) console.log(`  ${anio}: ${fmt(n)}`);
  }

  // Llamadas directas a la RPC
  const casos: [string, string | null, string | null][] = [
    ["a) sin fechas", null, null],
    ["b) 2024-01-01 → null", "2024-01-01", null],
    ["c) 2024-01-01 → 2026-07-09", "2024-01-01", "2026-07-09"],
    ["d) 2024-01-01 → 2025-12-31", "2024-01-01", "2025-12-31"],
  ];
  for (const [etq, fi, ff] of casos) {
    const { data, error } = await sb.rpc("brujula_gasto_por_sector", {
      p_divipola: "76001",
      p_fecha_inicio: fi,
      p_fecha_fin: ff,
    });
    console.log(`\nRPC ${etq}`);
    if (error) {
      console.log(`   ERROR: ${error.message}`);
      continue;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (data as any[]) ?? [];
    const tot = rows.reduce((s, r) => s + Number(r.contratos ?? 0), 0);
    console.log(`   filas: ${rows.length}  |  contratos totales: ${fmt(tot)}`);
    for (const r of rows.slice(0, 4)) console.log(`     ${String(r.sector).padEnd(38)} ${fmt(Number(r.contratos))} contr.`);
  }

  console.log("\n✓ diagnóstico completado.");
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});

export {};
