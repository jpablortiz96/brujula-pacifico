import { loadEnvConfig } from "@next/env";
import { performance } from "node:perf_hooks";

loadEnvConfig(process.cwd());

import { createAdminClient } from "@/lib/supabase/admin";

const RUNS = 3;

type Benchmark = {
  name: string;
  run: () => Promise<unknown>;
};

function formatMs(value: number): string {
  return `${value.toFixed(1)} ms`;
}

async function measure(benchmark: Benchmark): Promise<void> {
  const samples: number[] = [];

  for (let run = 0; run < RUNS; run += 1) {
    const start = performance.now();
    await benchmark.run();
    samples.push(performance.now() - start);
  }

  const min = Math.min(...samples);
  const max = Math.max(...samples);
  const average = samples.reduce((total, value) => total + value, 0) / samples.length;

  console.log(
    `${benchmark.name}\n` +
      `  muestras: ${samples.map(formatMs).join(", ")}\n` +
      `  min: ${formatMs(min)} | avg: ${formatMs(average)} | max: ${formatMs(max)}`
  );
}

async function getMunicipioConContratos(): Promise<string> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("secop_contratos")
    .select("codigo_municipio")
    .not("codigo_municipio", "is", null)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data?.codigo_municipio) {
    throw new Error("No se encontro un municipio con contratos para el benchmark.");
  }

  return data.codigo_municipio;
}

async function listarMunicipiosConDatosParaBenchmark(): Promise<void> {
  const sb = createAdminClient();
  const { error } = await sb.rpc("brujula_municipios_con_datos");
  if (!error) return;

  if (error.code !== "PGRST202" && error.code !== "42883") throw error;

  // Mantiene comparable la linea base hasta que se aplique la nueva RPC.
  const { error: municipiosError } = await sb
    .from("municipios")
    .select("divipola, nombre, departamento");
  if (municipiosError) throw municipiosError;

  const pageSize = 1000;
  for (let page = 0; page < 60; page += 1) {
    const from = page * pageSize;
    const { data, error: conteoError } = await sb
      .from("secop_contratos")
      .select("codigo_municipio")
      .not("codigo_municipio", "is", null)
      .range(from, from + pageSize - 1);
    if (conteoError) throw conteoError;
    if (!data || data.length < pageSize) break;
  }
}

async function main(): Promise<void> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY. Configure .env.local antes de medir."
    );
  }

  const divipola = await getMunicipioConContratos();
  const sb = createAdminClient();

  console.log(`Benchmark de queries contra Supabase (3 ejecuciones, municipio ${divipola})\n`);

  const benchmarks: Benchmark[] = [
    {
      name: "getKPIs (sin filtros)",
      run: async () => {
        const { error } = await sb.rpc("brujula_kpis", {
          p_departamento: null,
          p_fecha_inicio: null,
          p_fecha_fin: null,
          p_valor_min: null,
          p_valor_max: null,
          p_busqueda: null,
        });
        if (error) throw error;
      },
    },
    {
      name: "getMunicipiosStats (sin filtros)",
      run: async () => {
        const { error } = await sb.rpc("brujula_municipios_stats", {
          p_departamento: null,
          p_fecha_inicio: null,
          p_fecha_fin: null,
          p_valor_min: null,
          p_valor_max: null,
          p_busqueda: null,
        });
        if (error) throw error;
      },
    },
    { name: "listarMunicipiosConDatos", run: listarMunicipiosConDatosParaBenchmark },
    {
      name: "getZonasOlvidadas",
      run: async () => {
        const { error } = await sb.rpc("brujula_zonas_olvidadas_v4");
        if (error) throw error;
      },
    },
    {
      name: "getGastoPorSector",
      run: async () => {
        const { error } = await sb.rpc("brujula_gasto_por_sector", {
          p_divipola: divipola,
          p_fecha_inicio: null,
          p_fecha_fin: null,
        });
        if (error) throw error;
      },
    },
    {
      name: "brujula_indicadores_municipio",
      run: async () => {
        const { error } = await sb.rpc("brujula_indicadores_municipio", {
          p_divipola: divipola,
        });
        if (error) throw error;
      },
    },
  ];

  for (const benchmark of benchmarks) {
    await measure(benchmark);
  }
}

main().catch((error: unknown) => {
  console.error("Benchmark fallido:", error);
  process.exitCode = 1;
});
