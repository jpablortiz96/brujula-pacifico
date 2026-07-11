#!/usr/bin/env tsx
/**
 * ingest-secop.ts
 * Descarga contratos SECOP II filtrados al Pacífico y los upserta en Supabase.
 *
 * Dataset: SECOP II — Contratos Electrónicos (jbjy-vk9h)
 * Schema real verificado con inspect-secop.ts:
 *   - Fechas: fecha_de_firma, fecha_de_inicio_del_contrato, fecha_de_fin_del_contrato
 *   - Duración: duraci_n_del_contrato (ej: "3 Mes(es)")
 *   - URL: urlproceso viene como objeto { url: "https://..." }
 *   - No existe codigo_municipio — se deriva de ciudad en enrich-divipola.ts
 *
 * Uso:
 *   npm run ingest:secop
 *   npm run ingest:secop -- --max 5000
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// ── Cargar .env.local ─────────────────────────────────────────────────────────
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
} catch { /* vars del sistema */ }

// ── Config ────────────────────────────────────────────────────────────────────
const DATASET   = "jbjy-vk9h";
const BASE      = `https://www.datos.gov.co/resource/${DATASET}.json`;
const PAGE_SIZE = 1000;
const SLEEP_MS  = 400;

// Ingesta incremental: --desde=YYYY-MM-DD trae solo lo firmado después.
const DESDE = (() => {
  const f = process.argv.find((a) => a.startsWith("--desde="));
  return f ? f.split("=")[1] : null;
})();

const MAX_ROWS = (() => {
  const i = process.argv.indexOf("--max");
  if (i !== -1) return parseInt(process.argv[i + 1], 10);
  return DESDE ? 300_000 : 30_000; // incremental puede traer mucho más
})();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "ERROR: Faltan variables de entorno.\n" +
    "  NEXT_PUBLIC_SUPABASE_URL  = " + (SUPABASE_URL ? "OK" : "FALTA") + "\n" +
    "  SUPABASE_SERVICE_ROLE_KEY = " + (SERVICE_KEY ? "OK" : "FALTA")
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── Helpers de parseo ─────────────────────────────────────────────────────────

/** "2025-10-07T00:00:00.000" → "2025-10-07" | null */
function parseSocrataDate(s: string | undefined | null): string | null {
  if (!s) return null;
  try {
    const clean = String(s).trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
    const d = new Date(s);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  } catch { return null; }
}

/** "8055000" | 8055000 → 8055000 | null */
function parseSocrataNumber(s: string | number | undefined | null): number | null {
  if (s == null || s === "") return null;
  const n = parseFloat(String(s).replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? null : n;
}

/** "3 Mes(es)" → 3 | null (extrae el primer número) */
function parseDuracion(s: string | undefined | null): number | null {
  if (!s) return null;
  const m = String(s).match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

/** urlproceso puede ser objeto {url: "..."} o string */
function parseUrlProceso(v: unknown): string | null {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (typeof v === "object" && v !== null && "url" in v) return (v as Record<string, string>).url ?? null;
  return null;
}

// ── Mapeo de registro crudo → schema interno ──────────────────────────────────
type SecopRaw = Record<string, unknown>;

function mapContrato(raw: SecopRaw): Record<string, unknown> | null {
  const id = (raw["id_contrato"] as string)?.trim();
  if (!id) return null;

  return {
    id,
    referencia_contrato:    (raw["referencia_del_contrato"] as string) ?? null,
    nombre_entidad:         (raw["nombre_entidad"] as string) ?? null,
    nit_entidad:            (raw["nit_entidad"] as string) ?? null,
    departamento:           (raw["departamento"] as string) ?? null,
    ciudad:                 (raw["ciudad"] as string) ?? null,
    codigo_municipio:       null,                                      // lo llena enrich-divipola.ts
    objeto_contrato:        (raw["objeto_del_contrato"] as string) ?? null,
    tipo_contrato:          (raw["tipo_de_contrato"] as string) ?? null,
    modalidad_contratacion: (raw["modalidad_de_contratacion"] as string) ?? null,
    estado_contrato:        (raw["estado_contrato"] as string) ?? null,
    proveedor_adjudicado:   (raw["proveedor_adjudicado"] as string) ?? null,
    documento_proveedor:    (raw["documento_proveedor"] as string) ?? null,
    valor_contrato:         parseSocrataNumber(raw["valor_del_contrato"] as string),
    valor_pagado:           parseSocrataNumber(raw["valor_pagado"] as string),
    fecha_firma:            parseSocrataDate(raw["fecha_de_firma"] as string),
    fecha_inicio:           parseSocrataDate(raw["fecha_de_inicio_del_contrato"] as string),
    fecha_fin:              parseSocrataDate(raw["fecha_de_fin_del_contrato"] as string),
    duracion:               parseDuracion(raw["duraci_n_del_contrato"] as string),
    url_proceso:            parseUrlProceso(raw["urlproceso"]),
    raw,
  };
}

// ── Paginación ────────────────────────────────────────────────────────────────
async function fetchPage(offset: number): Promise<SecopRaw[]> {
  // Ordenamos por id_contrato (sin NULLs) para obtener muestra representativa.
  // "fecha_de_firma DESC" pone los NULLs primero en Socrata y sesgaría la muestra.
  let cond =
    "upper(departamento) in ('CAUCA','CHOCÓ','CHOCO','NARIÑO','NARINO','VALLE DEL CAUCA','VALLE')";
  if (DESDE) cond += ` AND fecha_de_firma > '${DESDE}T00:00:00'`;
  const where = encodeURIComponent(cond);
  const order = encodeURIComponent("id_contrato ASC");
  const endpoint =
    `${BASE}?$where=${where}&$order=${order}&$limit=${PAGE_SIZE}&$offset=${offset}`;

  const res = await fetch(endpoint, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

// ── Main ──────────────────────────────────────────────────────────────────────
function log(msg: string) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  log("=".repeat(70));
  log("BRÚJULA — ingest:secop (mapeo corregido)");
  log(`Dataset: ${DATASET}  |  Máx. filas: ${MAX_ROWS.toLocaleString()}`);
  log("=".repeat(70));

  const stats = {
    descargados:    0,
    insertados:     0,
    errores:        0,
    conFechaFirma:  0,
    conCiudad:      0,
    porDepto:       {} as Record<string, number>,
    valorTotal:     0,
    maxFecha:       "",
  };

  if (DESDE) log(`Modo INCREMENTAL: solo contratos firmados después de ${DESDE}`);
  const maxPages = Math.ceil(MAX_ROWS / PAGE_SIZE);

  for (let page = 0; page < maxPages; page++) {
    const offset = page * PAGE_SIZE;
    log(`Página ${page + 1}/${maxPages}  (offset ${offset})...`);

    let rawBatch: SecopRaw[];
    try {
      rawBatch = await fetchPage(offset);
    } catch (e) {
      log(`  WARN descarga falló: ${e}`);
      stats.errores++;
      await sleep(SLEEP_MS * 4);
      continue;
    }

    log(`  Descargados: ${rawBatch.length}`);
    stats.descargados += rawBatch.length;
    if (rawBatch.length === 0) { log("  Fin de paginación."); break; }

    const mapped = rawBatch
      .map(mapContrato)
      .filter((r): r is NonNullable<typeof r> => r !== null);

    // Acumular stats
    for (const c of mapped) {
      if (c.fecha_firma) {
        stats.conFechaFirma++;
        const f = c.fecha_firma as string;
        if (f > stats.maxFecha) stats.maxFecha = f;
      }
      if (c.ciudad)       stats.conCiudad++;
      const dep = (c.departamento as string) ?? "DESCONOCIDO";
      stats.porDepto[dep] = (stats.porDepto[dep] ?? 0) + 1;
      stats.valorTotal += (c.valor_contrato as number) ?? 0;
    }

    // Upsert en chunks de 500
    for (let i = 0; i < mapped.length; i += 500) {
      const chunk = mapped.slice(i, i + 500);
      try {
        const { error } = await supabase
          .from("secop_contratos")
          .upsert(chunk, { onConflict: "id" });
        if (error) { log(`  WARN upsert: ${error.message}`); stats.errores++; }
        else stats.insertados += chunk.length;
      } catch (e) {
        log(`  WARN upsert exception: ${e}`); stats.errores++;
      }
    }
    log(`  Insertados acumulado: ${stats.insertados}`);
    if (rawBatch.length < PAGE_SIZE) { log("  Última página."); break; }
    await sleep(SLEEP_MS);
  }

  // ── Resumen ───────────────────────────────────────────────────────────────
  const fmt = (n: number) =>
    new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(n);
  const pct = (n: number, d: number) =>
    d > 0 ? ((n / d) * 100).toFixed(1) + "%" : "—";

  log("");
  log("=".repeat(70));
  log("RESUMEN FINAL");
  log("=".repeat(70));
  log(`✓ Descargados       : ${fmt(stats.descargados)}`);
  log(`✓ Insertados/upd.   : ${fmt(stats.insertados)}`);
  if (stats.errores > 0) log(`⚠ Errores           : ${stats.errores}`);
  log(`✓ % con fecha_firma : ${pct(stats.conFechaFirma, stats.insertados)}`);
  log(`✓ % con ciudad      : ${pct(stats.conCiudad, stats.insertados)}`);
  log(`  % con codigo_muni : 0% (se llena con enrich:divipola)`);
  log(`✓ Valor total       : $${fmt(stats.valorTotal)} COP`);
  log(`✓ Fecha máxima nueva: ${stats.maxFecha || "—"}`);
  log("");
  log("Por departamento:");
  for (const [dep, n] of Object.entries(stats.porDepto).sort(([,a],[,b]) => b - a)) {
    log(`  ${dep.padEnd(25)} ${fmt(n)} contratos`);
  }
  log("");
  log("✓ ingest:secop completado. Siguiente: npm run enrich:divipola");
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
