#!/usr/bin/env tsx
/**
 * clasificar-sectores.ts
 * Clasifica los contratos SECOP por sector: primero keywords, luego LLM
 * (Haiku) para los ambiguos. Con --dry-run no escribe, solo reporta.
 *
 * Flags: --dry-run  --limit=N
 *
 * 📋 ACCIÓN MANUAL PREVIA (para el modo real): ejecutar
 *    supabase/alter-secop-sector.sql en Supabase.
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { clasificarPorKeywords, type Sector, SECTORES } from "../lib/clasificacion/sectores";
import { clasificarConLLM } from "../lib/clasificacion/llm-clasificador";

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

const DRY = process.argv.includes("--dry-run");
const LIMIT = (() => {
  const f = process.argv.find((a) => a.startsWith("--limit="));
  return f ? parseInt(f.split("=")[1], 10) : Infinity;
})();

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const PAGE = 500;
const LLM_BATCH = 25;
const fmt = (n: number) => new Intl.NumberFormat("es-CO").format(Math.round(n));
const money = (n: number) => `$${fmt(n)}`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Fila {
  id: string;
  objeto_contrato: string | null;
  valor_contrato: number | null;
}
interface Resultado {
  id: string;
  objeto: string;
  valor: number;
  sector: Sector | string;
  confianza: "alta" | "media";
  via: "keywords" | "llm";
}

async function main() {
  console.log("=".repeat(74));
  console.log(`BRÚJULA — clasificar:sectores ${DRY ? "(DRY RUN)" : "(ESCRITURA REAL)"}`);
  console.log(`Límite: ${LIMIT === Infinity ? "todos" : LIMIT}`);
  console.log("=".repeat(74));

  const resultados: Resultado[] = [];
  const colaLLM: { idx: number; objeto: string }[] = [];

  let from = 0;
  let procesados = 0;
  while (procesados < LIMIT) {
    const tope = Math.min(PAGE, LIMIT - procesados);
    let q = sb
      .from("secop_contratos")
      .select("id, objeto_contrato, valor_contrato")
      .order("id")
      .range(from, from + tope - 1);
    // En modo real solo los aún no clasificados.
    if (!DRY) q = q.is("sector_inferido", null);

    const { data, error } = await q;
    if (error) {
      console.error("FATAL fetch:", error.message);
      process.exit(1);
    }
    if (!data || data.length === 0) break;

    for (const r of data as Fila[]) {
      const objeto = (r.objeto_contrato ?? "").trim();
      const valor = Number(r.valor_contrato ?? 0);
      const kw = clasificarPorKeywords(objeto);
      if (kw) {
        resultados.push({ id: r.id, objeto, valor, sector: kw.sector, confianza: kw.confianza, via: "keywords" });
      } else {
        const idx = resultados.push({ id: r.id, objeto, valor, sector: "Otro", confianza: "media", via: "llm" }) - 1;
        colaLLM.push({ idx, objeto });
      }
    }

    procesados += data.length;
    from += data.length;
    process.stdout.write(`\r  Leídos: ${procesados}  | keywords: ${resultados.length - colaLLM.length}  | cola LLM: ${colaLLM.length}   `);
    if (data.length < tope) break;
  }
  console.log("");

  // ── Cola LLM en batches ────────────────────────────────────────────────
  let llamadasLLM = 0;
  for (let i = 0; i < colaLLM.length; i += LLM_BATCH) {
    const batch = colaLLM.slice(i, i + LLM_BATCH);
    const sectores = await clasificarConLLM(batch.map((b) => b.objeto));
    llamadasLLM++;
    batch.forEach((b, j) => {
      resultados[b.idx].sector = sectores[j] ?? "Otro";
    });
    process.stdout.write(`\r  LLM batch ${llamadasLLM} (${Math.min(i + LLM_BATCH, colaLLM.length)}/${colaLLM.length})   `);
    await sleep(500);
  }
  console.log("");

  // ── Escritura (solo modo real) ─────────────────────────────────────────
  if (!DRY) {
    let escritos = 0;
    for (let i = 0; i < resultados.length; i += 200) {
      const chunk = resultados.slice(i, i + 200);
      await Promise.all(
        chunk.map((r) =>
          sb
            .from("secop_contratos")
            .update({ sector_inferido: r.sector, sector_confianza: r.confianza })
            .eq("id", r.id)
        )
      );
      escritos += chunk.length;
      process.stdout.write(`\r  Escritos: ${escritos}/${resultados.length}   `);
    }
    console.log("");
  }

  reporte(resultados, llamadasLLM);
}

function reporte(res: Resultado[], llamadasLLM: number) {
  const total = res.length;
  const valorTotal = res.reduce((s, r) => s + r.valor, 0);
  const porKw = res.filter((r) => r.via === "keywords").length;
  const porLlm = total - porKw;

  console.log("\n" + "=".repeat(74));
  console.log("DISTRIBUCIÓN POR SECTOR");
  console.log("=".repeat(74));
  console.log(`  ${"Sector".padEnd(38)} ${"Contr.".padStart(7)} ${"%c".padStart(6)} ${"%valor".padStart(7)}`);
  console.log("  " + "─".repeat(64));

  const porSector = new Map<string, { n: number; valor: number }>();
  for (const r of res) {
    const g = porSector.get(String(r.sector)) ?? { n: 0, valor: 0 };
    g.n++;
    g.valor += r.valor;
    porSector.set(String(r.sector), g);
  }
  const ordenados = [...porSector.entries()].sort((a, b) => b[1].valor - a[1].valor);
  for (const [sector, g] of ordenados) {
    const pctC = total ? (100 * g.n) / total : 0;
    const pctV = valorTotal ? (100 * g.valor) / valorTotal : 0;
    console.log(
      `  ${sector.padEnd(38)} ${fmt(g.n).padStart(7)} ${pctC.toFixed(1).padStart(5)}% ${pctV.toFixed(1).padStart(6)}%`
    );
  }

  console.log("\n" + "─".repeat(74));
  console.log(`Total contratos     : ${fmt(total)}`);
  console.log(`Valor total         : ${money(valorTotal)}`);
  console.log(`Resueltos keywords  : ${fmt(porKw)}  (${total ? ((100 * porKw) / total).toFixed(1) : 0}%)`);
  console.log(`Resueltos LLM       : ${fmt(porLlm)}  (${total ? ((100 * porLlm) / total).toFixed(1) : 0}%)`);
  const adminPct = total ? (100 * (porSector.get("Administración y servicios generales")?.n ?? 0)) / total : 0;
  console.log(`% Administración    : ${adminPct.toFixed(1)}%  ${adminPct > 45 ? "⚠️ >45% — afinar keywords" : "✓"}`);

  // Costo estimado LLM (~700 in / 200 out por llamada, tarifas Haiku).
  const costo = llamadasLLM * (700 * 1e-6 + 200 * 5e-6); // aprox USD
  console.log(`Llamadas LLM        : ${llamadasLLM}  (~$${costo.toFixed(3)} USD estimado)`);

  // ── Ejemplos por sector ─────────────────────────────────────────────────
  console.log("\n" + "=".repeat(74));
  console.log("5 EJEMPLOS POR SECTOR (para validar la clasificación)");
  console.log("=".repeat(74));
  for (const sector of SECTORES) {
    const ejemplos = res.filter((r) => r.sector === sector).slice(0, 5);
    if (ejemplos.length === 0) continue;
    console.log(`\n▶ ${sector} (${porSector.get(sector)?.n ?? 0})`);
    for (const e of ejemplos) {
      console.log(`   • [${e.via}] ${e.objeto.slice(0, 90)}`);
    }
  }

  console.log("\n" + (DRY ? "✓ DRY RUN — nada escrito. Revisa la distribución." : "✓ Clasificación escrita en secop_contratos."));
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});

export {};
