#!/usr/bin/env tsx
/**
 * reset-otro.ts
 * Pone sector_inferido = NULL en los contratos marcados 'Otro' para
 * reclasificarlos. Lo hace POR LOTES (el UPDATE masivo hace timeout por el
 * raw jsonb pesado). Luego se corre `npm run clasificar:sectores`.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

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

async function main() {
  const { count: antes } = await sb
    .from("secop_contratos")
    .select("*", { count: "exact", head: true })
    .eq("sector_inferido", "Otro");
  console.log(`'Otro' a resetear: ${antes ?? 0}`);

  let reseteados = 0;
  for (;;) {
    // Trae un lote de ids que aún son 'Otro' (el set se encoge en cada vuelta).
    const { data, error } = await sb
      .from("secop_contratos")
      .select("id")
      .eq("sector_inferido", "Otro")
      .limit(1000);
    if (error) {
      console.error("ERROR select:", error.message);
      break;
    }
    if (!data || data.length === 0) break;

    const ids = data.map((r) => (r as { id: string }).id);
    for (let i = 0; i < ids.length; i += 250) {
      const chunk = ids.slice(i, i + 250);
      const { error: upErr } = await sb
        .from("secop_contratos")
        .update({ sector_inferido: null, sector_confianza: null })
        .in("id", chunk);
      if (upErr) console.error("  WARN update:", upErr.message);
      else reseteados += chunk.length;
    }
    process.stdout.write(`\r  reseteados: ${reseteados}   `);
  }
  console.log(`\n✓ Reset completo: ${reseteados} filas. Siguiente: npm run clasificar:sectores`);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});

export {};
