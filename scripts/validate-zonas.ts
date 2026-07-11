#!/usr/bin/env tsx
/**
 * validate-zonas.ts
 * Valida el Detector de Zonas Olvidadas v3 (per cápita real con fex).
 *
 * Requiere (orden de ejecución):
 *   - Sisbén re-ingestado balanceado (scripts/ingest-sisben.ts)
 *   - npm run enrich:multi
 *   - supabase/alter-municipios-sisben-poblacion.sql ejecutado
 *   - npm run enrich:sisben-poblacion (población expandida autoritativa)
 *   - supabase/functions-zonas-olvidadas-v3.sql ejecutado en Supabase
 *
 * Chequea:
 *   - Top 10 v3 con todas las columnas (incl. población vulnerable estimada
 *     e inversión per cápita real)
 *   - Municipios excluidos por muestra insuficiente
 *   - Que el ranking NO sea puro municipios con "A" (diversidad alfabética)
 *   - Diversidad geográfica (varios departamentos)
 *   - Presencia de Pacífico profundo si tiene datos
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

const fmt = (n: unknown) =>
  n == null ? "—" : new Intl.NumberFormat("es-CO").format(Number(n));

// Municipios del Pacífico profundo que un experto reconocería como
// genuinamente desatendidos (códigos reales verificados).
const PACIFICO_PROFUNDO = new Set([
  "19807", // Timbiquí
  "19300", // Guapi
  "19397", // López de Micay
  "52250", // El Charco
  "52490", // Olaya Herrera
  "52621", // Roberto Payán
  "27250", // El Litoral del San Juan
  "27495", // Nuquí
  "27075", // Bahía Solano
]);

async function main() {
  console.log("=".repeat(88));
  console.log("BRÚJULA — validate:zonas (Detector de Zonas Olvidadas v2)");
  console.log("=".repeat(88));

  // ── Ranking v4 ──────────────────────────────────────────────────────────
  const { data: zonas, error } = await supabase.rpc("brujula_zonas_olvidadas_v4");
  if (error) {
    console.log(`\n⚠️  Error: ${error.message}`);
    console.log("   ↳ ¿Ejecutaste supabase/functions-zonas-olvidadas-v4.sql y enrich:sisben-poblacion?");
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (zonas as any[]) ?? [];
  const top10 = rows.slice(0, 10);

  console.log(`\n▶ TOP 10 ZONAS OLVIDADAS (de ${rows.length} rankeadas)\n`);
  console.log(
    `  ${"#".padStart(2)} ${"Municipio".padEnd(22)} ${"Depto".padEnd(14)} ` +
      `${"Contr".padStart(5)} ${"PobVuln".padStart(9)} ${"%Vuln".padStart(6)} ` +
      `${"Inv/vuln".padStart(11)} ${"Score".padStart(6)} ${"Categoría".padEnd(16)} ${"Calidad SECOP".padEnd(20)}`
  );
  console.log("  " + "─".repeat(120));
  top10.forEach((z, i) => {
    console.log(
      `  ${String(i + 1).padStart(2)} ${String(z.nombre ?? "").padEnd(22)} ` +
        `${String(z.departamento ?? "").padEnd(14)} ` +
        `${fmt(z.contratos).padStart(5)} ` +
        `${fmt(z.poblacion_vulnerable_estimada).padStart(9)} ` +
        `${String(z.pct_vulnerable ?? "—").padStart(5)}% ` +
        `${fmt(z.inversion_per_vulnerable).padStart(11)} ` +
        `${String(z.score_olvido ?? "—").padStart(6)} ` +
        `${String(z.categoria ?? "").padEnd(16)} ${String(z.calidad_dato_secop ?? "—").padEnd(20)}`
    );
  });

  // Distribución de calidad_dato_secop + chequeo de Zarzal.
  const calidad = rows.reduce((acc: Record<string, number>, z) => {
    const k = String(z.calidad_dato_secop ?? "—");
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
  console.log(
    `\n  Calidad dato SECOP (todos): ` +
      Object.entries(calidad).map(([k, v]) => `${k}=${v}`).join("  ")
  );
  const zarzal = rows.find((z) => String(z.divipola) === "76895");
  if (zarzal) {
    console.log(
      `  Zarzal (76895): ${zarzal.contratos} contratos → calidad='${zarzal.calidad_dato_secop}'`
    );
  }

  // ── Municipios sin datos (transparencia) ────────────────────────────────
  const { data: sinDatos, error: errSin } = await supabase.rpc("brujula_zonas_sin_datos");
  console.log(`\n▶ MUNICIPIOS QUE REQUIEREN VERIFICACIÓN (muestra insuficiente)\n`);
  if (errSin) {
    console.log(`  ⚠️  ${errSin.message}`);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sd = (sinDatos as any[]) ?? [];
    if (sd.length === 0) {
      console.log("  (ninguno)");
    } else {
      for (const z of sd) {
        console.log(
          `  ${String(z.divipola).padEnd(7)} ${String(z.nombre ?? "").padEnd(28)} ` +
            `${String(z.departamento ?? "").padEnd(16)} ` +
            `sisbén=${fmt(z.sisben_total).padStart(4)} homicidios=${fmt(z.homicidios).padStart(3)}`
        );
      }
    }
  }

  // ── Chequeos de rigor ───────────────────────────────────────────────────
  console.log(`\n${"=".repeat(88)}`);
  console.log("CHEQUEOS DE RIGOR");
  console.log("=".repeat(88));

  const iniciales = top10.map((z) => String(z.nombre ?? "").trim().charAt(0).toUpperCase());
  const conA = iniciales.filter((c) => c === "A").length;
  const distintasIniciales = new Set(iniciales).size;
  const distintosDeptos = new Set(top10.map((z) => z.departamento)).size;
  const profundoPresentes = rows.filter((z) =>
    PACIFICO_PROFUNDO.has(String(z.divipola))
  );

  // Realismo del per cápita real (fex): población expandida >> muestra (400)
  // y valores de inversión per cápita no todos nulos/cero.
  const conPob = rows.filter((z) => Number(z.poblacion_vulnerable_estimada) > 400);
  const conInv = rows.filter((z) => z.inversion_per_vulnerable != null && Number(z.inversion_per_vulnerable) > 0);

  const okAlfabetico = conA <= 3 && distintasIniciales >= 5;
  const okGeografico = distintosDeptos >= 2;
  const okProfundo = profundoPresentes.length > 0;
  const okPoblacion = conPob.length >= rows.length * 0.8;
  const okInversion = conInv.length > 0;

  console.log(
    `  ${okAlfabetico ? "✓" : "✗"} Diversidad alfabética: ${conA}/10 empiezan con "A", ` +
      `${distintasIniciales} iniciales distintas (esperado: no puro "A")`
  );
  console.log(
    `  ${okGeografico ? "✓" : "✗"} Diversidad geográfica: ${distintosDeptos} departamentos en el top 10`
  );
  console.log(
    `  ${okProfundo ? "✓" : "✗"} Pacífico profundo en el ranking: ` +
      (profundoPresentes.length
        ? profundoPresentes.map((z) => z.nombre).join(", ")
        : "ninguno aún")
  );
  console.log(
    `  ${okPoblacion ? "✓" : "✗"} Población expandida real: ${conPob.length}/${rows.length} municipios ` +
      `con pob. vulnerable > 400 (muestra) → fex aplicado, no conteo de muestra`
  );
  console.log(
    `  ${okInversion ? "✓" : "✗"} Inversión per cápita realista: ${conInv.length}/${rows.length} ` +
      `con valor > 0 (no todos nulos/cero)`
  );

  console.log(`\n${"=".repeat(88)}`);
  if (okAlfabetico && okGeografico && okProfundo && okPoblacion && okInversion) {
    console.log("✓ RANKING DEFENDIBLE — diversidad + per cápita real con factor de expansión DANE.");
  } else {
    console.log("⚠️  Revisar: el ranking aún no cumple todos los criterios.");
    console.log("   (Verifica: enrich:multi, alter-municipios-sisben-poblacion.sql,");
    console.log("    enrich:sisben-poblacion y functions-zonas-olvidadas-v3.sql ejecutados.)");
  }
  console.log("=".repeat(88));
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});

export {};
