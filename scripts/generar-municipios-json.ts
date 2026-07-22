import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import { createAdminClient } from "@/lib/supabase/admin";

type MunicipioJson = {
  divipola: string;
  nombre: string;
  departamento: string;
  codigo_depto: string;
  lat: number | null;
  lng: number | null;
  sisben_pob_vulnerable: number | null;
};

const outputDirectory = path.join(process.cwd(), "public", "data");
const outputFile = path.join(outputDirectory, "municipios.json");

async function main(): Promise<void> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY. Configure .env.local antes de generar el catalogo."
    );
  }

  const sb = createAdminClient();
  const { data, error } = await sb
    .from("municipios")
    .select("divipola, nombre, departamento, codigo_depto, lat, lng, sisben_pob_vulnerable")
    .order("departamento")
    .order("nombre");

  if (error) throw error;

  const municipios: MunicipioJson[] = (data ?? []).map((municipio) => ({
    divipola: String(municipio.divipola),
    nombre: String(municipio.nombre),
    departamento: String(municipio.departamento),
    codigo_depto: String(municipio.codigo_depto),
    lat: municipio.lat == null ? null : Number(municipio.lat),
    lng: municipio.lng == null ? null : Number(municipio.lng),
    sisben_pob_vulnerable:
      municipio.sisben_pob_vulnerable == null
        ? null
        : Number(municipio.sisben_pob_vulnerable),
  }));

  await mkdir(outputDirectory, { recursive: true });
  await writeFile(outputFile, `${JSON.stringify(municipios, null, 2)}\n`, "utf8");
  console.log(`Catalogo generado: public/data/municipios.json (${municipios.length} municipios)`);
}

main().catch((error: unknown) => {
  console.error("No se pudo generar el catalogo de municipios:", error);
  process.exitCode = 1;
});
