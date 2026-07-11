"use client";

import { Info, ArrowRight, AlertTriangle } from "lucide-react";
import type { EscenarioSimulacion } from "@/lib/queries/simulador";
import { formatCOP } from "@/lib/zonas-ui";

type Rol = "funcionario" | "ciudadano";

export default function ResultadoSimulacion({
  escenario,
  rol,
}: {
  escenario: EscenarioSimulacion;
  rol: Rol;
}) {
  const ciudadano = rol === "ciudadano";
  const e = escenario;

  return (
    <div className="space-y-4">
      {/* Comparación per cápita actual → simulada */}
      {e.poblacion_valida ? (
        <div
          className="bg-white p-4 flex items-center justify-center gap-4 flex-wrap"
          style={{ border: "2px solid rgb(10 37 64)", borderRadius: 4 }}
        >
          <Cifra label="Per cápita actual" valor={formatCOP(e.inversion_per_capita_actual)} tono="muted" />
          <ArrowRight size={22} className="text-gov-amarillo flex-shrink-0" />
          <Cifra label="Per cápita simulada" valor={formatCOP(e.inversion_per_capita_simulada)} tono="azul" />
        </div>
      ) : (
        <div
          className="p-4 gov-mono"
          style={{ border: "2px solid rgb(239 159 39)", borderRadius: 4, background: "rgba(239,159,39,0.06)", fontSize: 13, color: "rgb(10 37 64)" }}
        >
          Este municipio no tiene población vulnerable estimada, por lo que no
          se puede calcular la inversión per cápita. Verifica los datos de
          Sisbén.
        </div>
      )}

      {/* Posición vs pares: cierre de brecha (por debajo) o panel de ventaja */}
      {e.poblacion_valida && e.benchmark_confiable && e.posicion_vs_pares === "por_debajo" && (
        <div className="bg-white p-4" style={{ border: "2px solid rgb(10 37 64)", borderRadius: 4 }}>
          <div className="flex items-center justify-between mb-2">
            <span className="gov-label text-gov-muted" style={{ fontSize: 10 }}>
              Brecha cerrada con el promedio de {e.municipio.departamento}
            </span>
            <span className="tabular-nums text-gov-azul" style={{ fontSize: 16, fontWeight: 700 }}>
              {e.brecha_cerrada_pct}%
            </span>
          </div>
          <div style={{ height: 12, background: "rgb(229 231 235)", borderRadius: 3, overflow: "hidden" }}>
            <div
              style={{
                width: `${e.brecha_cerrada_pct}%`,
                height: "100%",
                background: "rgb(26 135 84)",
                transition: "width 0.25s ease",
              }}
            />
          </div>
          <p className="text-gov-muted mt-2" style={{ fontSize: 11 }}>
            Promedio de pares: {formatCOP(e.inversion_per_capita_pares)} por persona vulnerable
            · {e.num_pares} municipios comparados.
          </p>
        </div>
      )}

      {e.poblacion_valida && e.benchmark_confiable && e.posicion_vs_pares === "por_encima" && (
        <div
          className="p-4"
          style={{ border: "2px solid rgb(26 135 84)", borderRadius: 4, background: "rgba(26,135,84,0.06)" }}
        >
          <p className="gov-label mb-1" style={{ fontSize: 10, color: "rgb(20 110 68)" }}>
            Por encima del benchmark regional
          </p>
          <p className="text-gov-azul" style={{ fontSize: 14, lineHeight: 1.5 }}>
            {e.municipio.nombre} ya invierte {formatCOP(e.inversion_per_capita_actual)} per cápita
            {e.ratio_vs_pares != null ? `, ${e.ratio_vs_pares}× el promedio de ${e.municipio.departamento} (${formatCOP(e.inversion_per_capita_pares)})` : ""}.
            No tiene una brecha de déficit que cerrar frente a sus pares.
          </p>
        </div>
      )}

      {e.poblacion_valida && e.benchmark_confiable && e.posicion_vs_pares === "en_promedio" && (
        <div className="bg-white p-4" style={{ border: "2px solid rgb(10 37 64)", borderRadius: 4 }}>
          <p className="text-gov-azul" style={{ fontSize: 14, lineHeight: 1.5 }}>
            {e.municipio.nombre} está en línea con el promedio de sus pares en{" "}
            {e.municipio.departamento} ({formatCOP(e.inversion_per_capita_pares)} per cápita ·{" "}
            {e.num_pares} municipios).
          </p>
        </div>
      )}

      {/* Proyección con lenguaje cauteloso */}
      {e.poblacion_valida && (
        <div
          className="p-4"
          style={{ border: "2px solid rgb(10 37 64)", borderLeft: "4px solid rgb(255 205 0)", borderRadius: 4, background: "#fff" }}
        >
          <p className="gov-label text-gov-muted mb-1" style={{ fontSize: 10 }}>
            Proyección (escenario de referencia)
          </p>
          <p className="text-gov-azul" style={{ fontSize: 15, lineHeight: 1.55 }}>
            {proyeccionTexto(e, ciudadano)}
          </p>
        </div>
      )}

      {/* Caja de supuestos — el rigor */}
      <div
        className="p-4"
        style={{ border: "2px solid rgb(10 37 64)", borderRadius: 4, background: "rgb(244 242 236)" }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Info size={16} className="text-gov-azul" />
          <span className="gov-label text-gov-azul" style={{ fontSize: 11 }}>
            Supuestos de esta simulación
          </span>
        </div>
        <ul className="space-y-1.5">
          {e.supuestos.map((s, i) => (
            <li key={i} className="flex gap-2" style={{ fontSize: 12.5, lineHeight: 1.45 }}>
              <span className="text-gov-amarillo select-none" style={{ lineHeight: 1.45 }}>▸</span>
              <span className="text-gov-azul">{s}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Aviso si el benchmark no es confiable */}
      {!e.benchmark_confiable && (
        <div className="flex items-start gap-2 px-1" style={{ fontSize: 12 }}>
          <AlertTriangle size={14} className="text-gov-rojo flex-shrink-0 mt-0.5" />
          <span className="text-gov-muted">
            Datos insuficientes de pares para un benchmark confiable. La
            proyección de cierre de brecha no se muestra.
          </span>
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-gov-muted" style={{ fontSize: 11, lineHeight: 1.5 }}>
        Este simulador produce escenarios de referencia con fines de planeación,
        no predicciones. Las cifras reales dependen de ejecución, contexto y
        factores no modelados.
      </p>
    </div>
  );
}

function proyeccionTexto(e: EscenarioSimulacion, ciudadano: boolean): string {
  const actual = formatCOP(e.inversion_per_capita_actual);
  const simulada = formatCOP(e.inversion_per_capita_simulada);
  const sim = e.inversion_per_capita_simulada;
  const act = e.inversion_per_capita_actual;

  // Dirección coherente con el movimiento del slider.
  const dir =
    sim > act
      ? `aumentaría de ${actual} a ${simulada}`
      : sim < act
        ? `se reduciría de ${actual} a ${simulada}`
        : `se mantendría en ${actual}`;
  const perCapita = ciudadano ? "por persona vulnerable" : "per cápita vulnerable";
  const base = `Con esta inversión, ${e.municipio.nombre} ${dir} ${perCapita}`;

  if (!e.benchmark_confiable) {
    return `${base}. No se dispone de suficientes pares para un benchmark confiable.`;
  }
  if (e.posicion_vs_pares === "por_debajo") {
    return ciudadano
      ? `${base}. Eso cerraría el ${e.brecha_cerrada_pct}% de la distancia con municipios parecidos de ${e.municipio.departamento}.`
      : `${base}, cerrando el ${e.brecha_cerrada_pct}% de la brecha con el promedio de ${e.municipio.departamento}.`;
  }
  if (e.posicion_vs_pares === "por_encima") {
    return `${base}. El municipio ya está por encima del promedio regional de ${e.municipio.departamento}.`;
  }
  return `${base}. El municipio está en línea con el promedio de ${e.municipio.departamento}.`;
}

function Cifra({
  label,
  valor,
  tono,
}: {
  label: string;
  valor: string;
  tono: "muted" | "azul";
}) {
  return (
    <div className="text-center">
      <p className="gov-label text-gov-muted" style={{ fontSize: 9 }}>
        {label}
      </p>
      <p
        className="tabular-nums"
        style={{
          fontSize: 22,
          fontWeight: 600,
          color: tono === "azul" ? "rgb(10 37 64)" : "rgb(92 107 122)",
        }}
      >
        {valor}
      </p>
    </div>
  );
}
