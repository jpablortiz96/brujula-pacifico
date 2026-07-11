#!/usr/bin/env tsx
/**
 * seed-coordenadas.ts
 * Asigna coordenadas geográficas aproximadas a los 178 municipios del Pacífico.
 * Los ~30 municipios más importantes tienen coords exactas; los demás reciben
 * el centroide aproximado del departamento.
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
} catch { /* vars del sistema */ }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("ERROR: Faltan variables de entorno");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Coordenadas exactas por código DIVIPOLA (lat, lng)
const COORDS: Record<string, [number, number]> = {
  // ── Valle del Cauca ──────────────────────────────────────────────────
  "76001": [3.4516,  -76.5320],  // Cali
  "76109": [3.8801,  -77.0313],  // Buenaventura
  "76520": [3.5394,  -76.3036],  // Palmira
  "76834": [4.0847,  -76.1958],  // Tuluá
  "76147": [4.7464,  -75.9117],  // Cartago
  "76111": [3.9019,  -76.2978],  // Guadalajara de Buga
  "76364": [3.2606,  -76.5378],  // Jamundí
  "76892": [3.5847,  -76.4914],  // Yumbo
  "76248": [3.3214,  -76.2336],  // Florida
  "76113": [3.4378,  -76.3428],  // Candelaria
  "76670": [4.2697,  -76.1519],  // Sevilla
  "76233": [4.7386,  -76.1544],  // El Águila — centroide
  // ── Cauca ────────────────────────────────────────────────────────────
  "19001": [2.4448,  -76.6147],  // Popayán
  "19701": [3.0103,  -76.4858],  // Santander de Quilichao
  "19142": [3.0367,  -76.4083],  // Caloto
  "19573": [3.2342,  -76.4108],  // Puerto Tejada
  "19533": [2.1158,  -77.0578],  // Patía
  "19100": [1.8367,  -76.9667],  // Bolívar
  "19256": [2.4517,  -76.8147],  // El Tambo
  "19300": [2.5726,  -77.8923],  // Guapi
  "19698": [2.6214,  -76.5294],  // Sotará — centroide
  "19743": [2.3978,  -76.6019],  // Timbío
  "19760": [2.0528,  -76.6314],  // Timbiquí — NOTE: Timbiquí is Cauca
  "19821": [1.7222,  -76.7233],  // El Bordo (Patía)
  // ── Nariño ───────────────────────────────────────────────────────────
  "52001": [1.2136,  -77.2811],  // Pasto
  "52835": [1.7892,  -78.7644],  // Tumaco
  "52356": [0.8275,  -77.6453],  // Ipiales
  "52079": [1.6717,  -78.1397],  // Barbacoas
  "52250": [2.4789,  -78.1131],  // El Charco
  "52390": [2.4006,  -78.1869],  // La Tola
  "52506": [2.3469,  -78.3253],  // Olaya Herrera
  "52473": [2.5047,  -78.4486],  // Mosquera
  "52258": [1.2317,  -77.5172],  // El Contadero
  "52699": [1.0922,  -77.4347],  // Samaniego
  "52788": [1.6236,  -77.5028],  // Taminango
  // ── Chocó ─────────────────────────────────────────────────────────────
  "27001": [5.6947,  -76.6611],  // Quibdó
  "27006": [8.5147,  -77.2783],  // Acandí
  "27615": [7.4406,  -77.1144],  // Riosucio
  "27361": [5.1597,  -76.6856],  // Istmina
  "27077": [6.2261,  -77.4011],  // Bahía Solano
  "27491": [5.7042,  -77.2719],  // Nuquí
  "27135": [5.0933,  -76.6458],  // Condoto
  "27050": [4.6667,  -76.7000],  // Atrato
  "27160": [6.1858,  -77.3572],  // El Carmen de Atrato
  "27250": [8.0567,  -76.7142],  // El Litoral del San Juan
  "27413": [8.0167,  -77.5833],  // Juradó
};

// Centroides por código de departamento (fallback)
const DEPT_CENTROIDS: Record<string, [number, number]> = {
  "19": [2.45,  -76.61],
  "27": [5.69,  -76.66],
  "52": [1.21,  -77.28],
  "76": [3.45,  -76.53],
};

function log(msg: string) { console.log(`[${new Date().toISOString().slice(11,19)}] ${msg}`); }

async function main() {
  log("=".repeat(60));
  log("BRÚJULA — seed:coordenadas");
  log("=".repeat(60));

  const { data: munis, error } = await sb
    .from("municipios")
    .select("divipola, codigo_depto");

  if (error) { console.error("FATAL:", error); process.exit(1); }
  if (!munis?.length) { log("No se encontraron municipios."); return; }

  log(`Total municipios: ${munis.length}`);

  let actualizados = 0;
  let usoCentroide = 0;

  // Procesa en lotes de 20 para no saturar la conexión
  for (let i = 0; i < munis.length; i += 20) {
    const lote = munis.slice(i, i + 20);
    await Promise.all(
      lote.map(async (m) => {
        const coord = COORDS[m.divipola] ?? DEPT_CENTROIDS[m.codigo_depto];
        if (!coord) return;
        const { error: ue } = await sb
          .from("municipios")
          .update({ lat: coord[0], lng: coord[1] })
          .eq("divipola", m.divipola);
        if (ue) { log(`  WARN ${m.divipola}: ${ue.message}`); return; }
        actualizados++;
        if (!COORDS[m.divipola]) usoCentroide++;
      })
    );
  }

  log("");
  log("=".repeat(60));
  log(`✓ Actualizados: ${actualizados} / ${munis.length}`);
  log(`  Con coord exacta: ${actualizados - usoCentroide}`);
  log(`  Con centroide dept: ${usoCentroide}`);
  log("✓ seed:coordenadas completado.");
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
