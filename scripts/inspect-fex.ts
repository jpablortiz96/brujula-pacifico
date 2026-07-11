#!/usr/bin/env tsx
/**
 * inspect-fex.ts
 * Verifica el factor de expansión estadístico (fex) del DANE en
 * sisben_personas antes de usarlo para per cápita real en el detector v3.
 *
 * Comprueba:
 *   - ¿La columna fex existe y tiene valores? (vs vivir solo en raw->>'fex')
 *   - count(*), count(fex), promedio, suma
 *   - 5 valores de ejemplo
 *   - Población vulnerable EXPANDIDA estimada (sum fex A/B) para
 *     Cértegui (27150), Tumaco (52835), Cali (76001)
 *
 * Solo lee. No modifica nada.
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

const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(n);

const FOCO: Record<string, string> = {
  "27150": "Cértegui",
  "52835": "Tumaco",
  "76001": "Cali",
};

interface Row {
  codigo_municipio: string | null;
  grupo: string | null;
  fex: number | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw: any;
}

async function main() {
  console.log("=".repeat(72));
  console.log("BRÚJULA — inspect:fex (factor de expansión DANE en Sisbén)");
  console.log("=".repeat(72));

  // ── ¿Existe la columna fex? ─────────────────────────────────────────────
  let columnaFexExiste = true;
  {
    const { error } = await supabase.from("sisben_personas").select("fex").limit(1);
    if (error && /column .*fex.* does not exist/i.test(error.message)) {
      columnaFexExiste = false;
    } else if (error) {
      console.log(`⚠️  Error consultando: ${error.message}`);
      return;
    }
  }

  if (!columnaFexExiste) {
    console.log("\n⚠️  La columna 'fex' NO existe como columna en la tabla.");
    console.log("   Probablemente vive dentro de raw->>'fex'.");
    console.log("\n📋 ACCIÓN MANUAL en Supabase SQL Editor:");
    console.log("     ALTER TABLE sisben_personas ADD COLUMN IF NOT EXISTS fex numeric;");
    console.log("     UPDATE sisben_personas SET fex = (raw->>'fex')::numeric WHERE fex IS NULL;");
    console.log("\n   (continúo leyendo desde raw->>'fex' para el diagnóstico)");
  }

  // ── Traer codigo_municipio, grupo, fex (y raw como fallback) paginado ────
  const PAGE = 1000;
  let from = 0;
  let total = 0;
  let conFex = 0;
  let sumFex = 0;
  const samples: number[] = [];
  const distintos = new Set<number>();
  const focoExpandido: Record<string, { total: number; vuln: number }> = {};
  for (const cod of Object.keys(FOCO)) focoExpandido[cod] = { total: 0, vuln: 0 };

  for (;;) {
    const { data, error } = await supabase
      .from("sisben_personas")
      .select("codigo_municipio, grupo, fex, raw")
      .range(from, from + PAGE - 1);
    if (error) {
      console.log(`⚠️  Error paginando: ${error.message}`);
      return;
    }
    if (!data || data.length === 0) break;

    for (const r of data as Row[]) {
      total++;
      let fex = r.fex;
      if (fex == null && r.raw && r.raw.fex != null) {
        const parsed = Number(r.raw.fex);
        fex = Number.isFinite(parsed) ? parsed : null;
      }
      if (fex != null && Number.isFinite(fex)) {
        conFex++;
        sumFex += fex;
        distintos.add(Number(fex.toFixed(4)));
        if (samples.length < 5) samples.push(fex);
        const cod = r.codigo_municipio ?? "";
        if (focoExpandido[cod]) {
          focoExpandido[cod].total += fex;
          if (r.grupo === "A" || r.grupo === "B") focoExpandido[cod].vuln += fex;
        }
      }
    }

    if (data.length < PAGE) break;
    from += PAGE;
  }

  // ── Reporte ─────────────────────────────────────────────────────────────
  console.log(`\nColumna 'fex' existe : ${columnaFexExiste ? "sí" : "no (leída de raw)"}`);
  console.log(`Total registros      : ${fmt(total)}`);
  console.log(`Con fex no nulo      : ${fmt(conFex)}  (${total ? ((100 * conFex) / total).toFixed(1) : 0}%)`);
  console.log(`Suma total fex       : ${fmt(sumFex)}  (≈ población expandida total)`);
  console.log(`Promedio fex         : ${conFex ? fmt(sumFex / conFex) : "—"}`);
  console.log(`Valores distintos    : ${distintos.size}  ${distintos.size <= 1 ? "⚠️ CONSTANTE (fex no sirve para expandir)" : ""}`);
  console.log(`Ejemplos de fex      : ${samples.map((s) => fmt(s)).join(", ")}`);

  console.log("\nPoblación vulnerable EXPANDIDA estimada (sum fex, grupos A/B):");
  console.log(`  ${"Municipio".padEnd(14)} ${"Pobl. total exp.".padStart(18)} ${"Pobl. vulnerable exp.".padStart(22)}`);
  for (const [cod, nombre] of Object.entries(FOCO)) {
    const f = focoExpandido[cod];
    console.log(
      `  ${nombre.padEnd(14)} ${fmt(Math.round(f.total)).padStart(18)} ${fmt(Math.round(f.vuln)).padStart(22)}`
    );
  }

  // ── Veredicto ───────────────────────────────────────────────────────────
  console.log("\n" + "=".repeat(72));
  if (conFex === 0) {
    console.log("✗ fex está vacío en todos los registros → NO se puede expandir. Revisar ingesta.");
  } else if (distintos.size <= 1) {
    console.log("✗ fex es constante → no aporta expansión real. Revisar fuente.");
  } else if (conFex < total * 0.8) {
    console.log(`⚠️  Solo ${((100 * conFex) / total).toFixed(1)}% tiene fex. Revisar antes de usar per cápita.`);
  } else {
    console.log("✓ fex válido y variable → apto para per cápita real con factor de expansión.");
  }
  console.log("=".repeat(72));
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});

export {};
