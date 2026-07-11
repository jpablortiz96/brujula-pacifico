#!/usr/bin/env tsx
/**
 * diagnose-secop-sin-muni.ts
 * Diagnóstico de contratos SECOP sin codigo_municipio: cuántos son, y qué
 * nombres de ciudad estamos perdiendo (para afinar el matcher DIVIPOLA).
 *
 * Solo lee. No modifica nada.
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { findDivipola, normalize } from "../lib/divipola/matcher";

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

async function countExact(build: () => ReturnType<typeof baseCount>): Promise<number> {
  const { count, error } = await build();
  if (error) throw new Error(error.message);
  return count ?? 0;
}
function baseCount() {
  return supabase.from("secop_contratos").select("*", { count: "exact", head: true });
}

interface Row {
  departamento: string | null;
  ciudad: string | null;
}

async function main() {
  console.log("=".repeat(78));
  console.log("BRÚJULA — diagnose:secop-sin-muni");
  console.log("=".repeat(78));

  // ── Cobertura global ────────────────────────────────────────────────────
  const total = await countExact(() => baseCount());
  const nulos = await countExact(() =>
    baseCount().is("codigo_municipio", null)
  );
  const conCod = total - nulos;
  console.log(`\nTotal contratos          : ${fmt(total)}`);
  console.log(`Con codigo_municipio     : ${fmt(conCod)}  (${((100 * conCod) / total).toFixed(1)}%)`);
  console.log(`SIN codigo_municipio     : ${fmt(nulos)}  (${((100 * nulos) / total).toFixed(1)}%)`);

  // ── Traer los NULL con departamento/ciudad ──────────────────────────────
  const PAGE = 1000;
  let from = 0;
  let sinCiudad = 0;
  // clave: `${depto}||${ciudadRaw}` → { count, depto, ciudad }
  const grupos = new Map<string, { count: number; depto: string; ciudad: string }>();

  for (;;) {
    const { data, error } = await supabase
      .from("secop_contratos")
      .select("departamento, ciudad")
      .is("codigo_municipio", null)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;

    for (const r of data as Row[]) {
      const ciudad = (r.ciudad ?? "").trim();
      if (!ciudad) {
        sinCiudad++;
        continue;
      }
      const depto = (r.departamento ?? "").trim();
      const key = `${depto}||${ciudad}`;
      const g = grupos.get(key) ?? { count: 0, depto, ciudad };
      g.count++;
      grupos.set(key, g);
    }

    if (data.length < PAGE) break;
    from += PAGE;
  }

  console.log(`\nDe los NULL: ${fmt(sinCiudad)} no tienen ciudad (irrecuperables por nombre).`);
  console.log(`Combinaciones (depto, ciudad) distintas sin match: ${fmt(grupos.size)}`);

  // ── Top 40 ciudades sin match ───────────────────────────────────────────
  const top = [...grupos.values()].sort((a, b) => b.count - a.count).slice(0, 40);

  console.log(`\nTOP 40 (departamento · ciudad) SIN match — con normalización y resultado actual:\n`);
  console.log(
    `  ${"n".padStart(5)}  ${"Departamento".padEnd(18)} ${"Ciudad (raw)".padEnd(30)} ` +
      `${"→ normalize".padEnd(28)} match?`
  );
  console.log("  " + "─".repeat(96));
  for (const g of top) {
    const norm = normalize(g.ciudad);
    const match = findDivipola(g.ciudad, g.depto);
    console.log(
      `  ${fmt(g.count).padStart(5)}  ${g.depto.slice(0, 18).padEnd(18)} ` +
        `${g.ciudad.slice(0, 30).padEnd(30)} ${norm.slice(0, 28).padEnd(28)} ` +
        `${match ?? "—"}`
    );
  }

  const recuperablesTop = top.reduce((s, g) => s + g.count, 0);
  console.log(
    `\nEstos 40 nombres suman ${fmt(recuperablesTop)} contratos sin geolocalizar.`
  );
  console.log("\n✓ diagnóstico completado. Revisa los patrones antes de tocar el matcher.");
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});

export {};
