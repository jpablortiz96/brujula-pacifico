#!/usr/bin/env tsx
/**
 * validate-sisben-balance.ts
 * Verifica que la re-ingesta balanceada del Sisbén realmente cubra el
 * Pacífico de forma equitativa (no solo los municipios alfabéticamente
 * primeros).
 *
 * Chequea:
 *   - Total de registros
 *   - Municipios distintos con datos (esperado > 80, vs ~20 del bug anterior)
 *   - Distribución por departamento
 *   - Presencia de municipios clave del Pacífico profundo (códigos reales
 *     verificados contra el dataset y el catálogo DANE)
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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const fmt = (n: number) => new Intl.NumberFormat("es-CO").format(n);

const DEPTOS: Record<string, string> = {
  "19": "Cauca",
  "27": "Chocó",
  "52": "Nariño",
  "76": "Valle del Cauca",
};

// Municipios clave del Pacífico profundo — CÓDIGOS REALES verificados.
const CLAVE: { cod: string; nombre: string }[] = [
  { cod: "19807", nombre: "Timbiquí" },
  { cod: "19300", nombre: "Guapi" },
  { cod: "19397", nombre: "López de Micay" },
  { cod: "52835", nombre: "Tumaco" },
  { cod: "52079", nombre: "Barbacoas" },
  { cod: "27075", nombre: "Bahía Solano" },
  { cod: "27495", nombre: "Nuquí" },
  { cod: "27250", nombre: "El Litoral del San Juan" },
];

/** Total de filas usando count exact, sin traer datos. */
async function countTotal(): Promise<number> {
  const { count: c, error } = await supabase
    .from("sisben_personas")
    .select("*", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  return c ?? 0;
}

/** Trae todos los codigo_municipio paginados para calcular distintos. */
async function fetchDistinct(): Promise<Map<string, number>> {
  const conteo = new Map<string, number>();
  const PAGE = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("sisben_personas")
      .select("codigo_municipio")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    for (const row of data) {
      const c = (row as { codigo_municipio: string }).codigo_municipio;
      if (c) conteo.set(c, (conteo.get(c) ?? 0) + 1);
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return conteo;
}

async function main() {
  console.log("=".repeat(72));
  console.log("BRÚJULA — validate:sisben-balance");
  console.log("=".repeat(72));

  const total = await countTotal();
  console.log(`\nTotal registros Sisbén: ${fmt(total)}`);

  if (total === 0) {
    console.log("\n⚠️  La tabla está vacía. ¿Ya corriste la re-ingesta?");
    return;
  }

  const conteo = await fetchDistinct();
  const distintos = conteo.size;
  console.log(`Municipios distintos con datos: ${distintos}`);
  console.log(
    distintos > 80
      ? "  ✓ OK — cobertura amplia (> 80 municipios)"
      : `  ⚠️  Solo ${distintos} municipios — ¿ingesta balanceada corrió completa?`
  );

  // Distribución por departamento
  console.log("\nDistribución por departamento:");
  const porDepto: Record<string, { mpios: number; regs: number }> = {};
  for (const [cod, n] of conteo) {
    const pref = cod.slice(0, 2);
    const dep = DEPTOS[pref] ?? `(${pref})`;
    if (!porDepto[dep]) porDepto[dep] = { mpios: 0, regs: 0 };
    porDepto[dep].mpios++;
    porDepto[dep].regs += n;
  }
  for (const [dep, r] of Object.entries(porDepto)) {
    console.log(`  ${dep.padEnd(20)} ${String(r.mpios).padStart(3)} municipios · ${fmt(r.regs).padStart(8)} registros`);
  }

  // Municipios clave del Pacífico profundo
  console.log("\nMunicipios clave del Pacífico profundo (códigos reales):");
  let faltantes = 0;
  for (const k of CLAVE) {
    const n = conteo.get(k.cod) ?? 0;
    const mark = n > 0 ? "✓" : "✗";
    if (n === 0) faltantes++;
    console.log(`  ${mark} ${k.cod}  ${k.nombre.padEnd(28)} ${fmt(n).padStart(5)} registros`);
  }

  console.log("\n" + "=".repeat(72));
  if (distintos > 80 && faltantes === 0) {
    console.log("✓ BALANCE OK — cobertura amplia y municipios clave presentes.");
  } else {
    console.log(
      `⚠️  Revisar: ${distintos} municipios distintos, ${faltantes} municipios clave sin datos.`
    );
  }
  console.log("=".repeat(72));
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});

export {};
