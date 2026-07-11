"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import SelectorMunicipio from "@/components/brujula/SelectorMunicipio";
import SimuladorSlider from "@/components/brujula/SimuladorSlider";
import ResultadoSimulacion from "@/components/brujula/ResultadoSimulacion";
import { useRol } from "@/lib/context/RolContext";
import type { MunicipioLista } from "@/lib/queries/comparador";
import type { EscenarioSimulacion } from "@/lib/queries/simulador";

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

// Recalcula los campos que dependen de la inversión (matemática pura,
// sin volver a llamar al API: el benchmark de pares no cambia).
function recomputar(
  base: EscenarioSimulacion,
  inversion: number
): EscenarioSimulacion {
  const pob = base.poblacion_vulnerable;
  const perCapitaSimulada = base.poblacion_valida ? Math.round(inversion / pob) : 0;
  // El cierre de brecha solo aplica si el municipio está por debajo de pares.
  let brecha = 0;
  if (
    base.poblacion_valida &&
    base.benchmark_confiable &&
    base.posicion_vs_pares === "por_debajo"
  ) {
    const gap = base.inversion_per_capita_pares - base.inversion_per_capita_actual;
    brecha =
      gap <= 0
        ? 0
        : clamp(
            ((perCapitaSimulada - base.inversion_per_capita_actual) / gap) * 100,
            0,
            100
          );
  }
  return {
    ...base,
    inversion_simulada_cop: inversion,
    inversion_per_capita_simulada: perCapitaSimulada,
    brecha_cerrada_pct: Math.round(brecha),
  };
}

export default function SimuladorClient() {
  const { rol } = useRol();

  const [municipios, setMunicipios] = useState<MunicipioLista[]>([]);
  const [divipola, setDivipola] = useState<string | null>("52835"); // Tumaco
  const [base, setBase] = useState<EscenarioSimulacion | null>(null);
  const [inversion, setInversion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lista de municipios (reusa el endpoint del comparador).
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await fetch("/api/comparador");
        const json = await res.json();
        if (!cancel) setMunicipios(json.municipios ?? []);
      } catch {
        /* el escenario mostrará su propio error */
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  // Escenario base al cambiar de municipio.
  useEffect(() => {
    if (!divipola) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/simulador?divipola=${divipola}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.detalle || json.error || `HTTP ${res.status}`);
        if (cancel) return;
        const esc = json as EscenarioSimulacion;
        setBase(esc);
        setInversion(esc.inversion_simulada_cop);
      } catch (err) {
        if (!cancel) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [divipola]);

  const escenario = useMemo(
    () => (base ? recomputar(base, inversion) : null),
    [base, inversion]
  );

  return (
    <div className="max-w-3xl mx-auto w-full space-y-5">
      {/* Título */}
      <div>
        <nav className="flex items-center gap-1 gov-label text-gov-muted mb-2" style={{ fontSize: 10 }}>
          <span>BRÚJULA</span>
          <ChevronRight size={11} />
          <span className="text-gov-azul">Simulador ¿y si…?</span>
        </nav>
        <h1 className="text-gov-azul" style={{ fontSize: 28, fontWeight: 600, lineHeight: 1.1 }}>
          Simulador de inversión — ¿y si…?
        </h1>
        <p className="text-gov-muted mt-1" style={{ fontSize: 14, maxWidth: 640 }}>
          Herramienta de planeación basada en la comparación con pares
          regionales. Mueve el slider para explorar escenarios de inversión.
        </p>
      </div>

      {/* Texto educativo */}
      <div
        className="p-3"
        style={{ border: "0.5px solid rgb(10 37 64 / 0.3)", borderLeft: "4px solid rgb(10 37 64)", borderRadius: 4, background: "#fff" }}
      >
        <p className="text-gov-azul" style={{ fontSize: 12.5, lineHeight: 1.5 }}>
          Este simulador compara el municipio con el promedio de inversión de
          sus pares en el mismo departamento y proyecta escenarios de cierre de
          brecha. No es una predicción: los supuestos están declarados abajo.
        </p>
      </div>

      {/* Selector */}
      <SelectorMunicipio
        municipios={municipios}
        value={divipola}
        onChange={setDivipola}
        label="Municipio a simular"
      />

      {error && (
        <div
          className="p-4 gov-mono"
          style={{ border: "2px solid rgb(206 17 38)", borderRadius: 4, color: "rgb(206 17 38)", fontSize: 13 }}
        >
          ⚠️ {error}
        </div>
      )}

      {loading || !escenario ? (
        <div className="p-8 text-center animate-pulse text-gov-muted" style={{ fontSize: 13 }}>
          {divipola ? "Cargando escenario…" : "Selecciona un municipio."}
        </div>
      ) : (
        <>
          {/* Texto según posición vs pares */}
          {escenario.poblacion_valida && escenario.benchmark_confiable && (
            <div
              className="p-3"
              style={{
                border: "0.5px solid rgb(10 37 64 / 0.3)",
                borderLeft: `4px solid ${escenario.posicion_vs_pares === "por_debajo" ? "rgb(206 17 38)" : escenario.posicion_vs_pares === "por_encima" ? "rgb(26 135 84)" : "rgb(92 107 122)"}`,
                borderRadius: 4,
                background: "#fff",
              }}
            >
              <p className="text-gov-azul" style={{ fontSize: 13, lineHeight: 1.5 }}>
                {escenario.posicion_vs_pares === "por_debajo"
                  ? `${escenario.municipio.nombre} está por debajo del promedio regional. Simula cuánto necesitaría para alcanzarlo.`
                  : escenario.posicion_vs_pares === "por_encima"
                    ? `${escenario.municipio.nombre} ya supera el promedio regional de inversión.`
                    : `${escenario.municipio.nombre} está en línea con el promedio regional.`}
              </p>
            </div>
          )}

          {/* Slider */}
          <div className="bg-white p-4" style={{ border: "2px solid rgb(10 37 64)", borderRadius: 4 }}>
            <SimuladorSlider
              inversionActual={escenario.inversion_actual_cop}
              inversionPares={escenario.inversion_pares_equivalente_cop}
              poblacion={escenario.poblacion_vulnerable}
              value={inversion}
              onChange={setInversion}
            />
          </div>

          {/* Resultado */}
          <ResultadoSimulacion escenario={escenario} rol={rol} />
        </>
      )}
    </div>
  );
}
