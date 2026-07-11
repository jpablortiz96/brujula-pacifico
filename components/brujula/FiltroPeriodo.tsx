"use client";

import { useMemo, useState } from "react";

export interface Periodo {
  fechaInicio: string | null; // YYYY-MM-DD o null (sin límite)
  fechaFin: string | null;
}

interface Props {
  fechaInicio: string | null;
  fechaFin: string | null;
  onChange: (p: Periodo) => void;
  // Rango real de datos (para el label dinámico de "Todo"). Opcional.
  rango?: { min: string | null; max: string | null };
}

function fechaMenosAnios(n: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - n);
  return d.toISOString().slice(0, 10);
}

function anio(fecha: string | null | undefined): string {
  return fecha ? fecha.slice(0, 4) : "";
}

function rangoLegible(inicio: string | null, fin: string | null): string {
  if (!inicio && !fin) return "todo el período disponible";
  const i = inicio ? inicio.slice(0, 7) : "inicio";
  const f = fin ? fin.slice(0, 7) : "hoy";
  return `${i} a ${f}`;
}

function coincide(p: Periodo, inicio: string | null, fin: string | null): boolean {
  return (p.fechaInicio ?? null) === inicio && (p.fechaFin ?? null) === fin;
}

export default function FiltroPeriodo({ fechaInicio, fechaFin, onChange, rango }: Props) {
  const [personalizado, setPersonalizado] = useState(false);
  const actual: Periodo = { fechaInicio, fechaFin };

  const presets = useMemo(() => {
    const min = anio(rango?.min);
    const max = anio(rango?.max);
    const etiquetaTodo = min && max ? `Todo (${min}-${max})` : "Todo";
    return [
      { label: etiquetaTodo, inicio: null as string | null, fin: null as string | null },
      { label: "Último año", inicio: fechaMenosAnios(1), fin: null },
      { label: "Últimos 2 años", inicio: fechaMenosAnios(2), fin: null },
      { label: "2024-2025", inicio: "2024-01-01", fin: "2025-12-31" },
      { label: "2020-2023", inicio: "2020-01-01", fin: "2023-12-31" },
    ];
  }, [rango?.min, rango?.max]);

  const presetActivo = !personalizado && presets.some((p) => coincide(actual, p.inicio, p.fin));

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="gov-label text-gov-muted" style={{ fontSize: 10 }}>Período</span>
        {presets.map((p) => {
          const activo = !personalizado && coincide(actual, p.inicio, p.fin);
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                setPersonalizado(false);
                onChange({ fechaInicio: p.inicio, fechaFin: p.fin });
              }}
              style={{
                border: "1px solid rgb(10 37 64)",
                background: activo ? "rgb(10 37 64)" : "#fff",
                color: activo ? "#fff" : "rgb(10 37 64)",
                padding: "4px 10px",
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {p.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setPersonalizado(true)}
          style={{
            border: "1px solid rgb(10 37 64)",
            background: personalizado || (!presetActivo && (fechaInicio || fechaFin)) ? "rgb(10 37 64)" : "#fff",
            color: personalizado || (!presetActivo && (fechaInicio || fechaFin)) ? "#fff" : "rgb(10 37 64)",
            padding: "4px 10px",
            borderRadius: 4,
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Personalizado
        </button>
      </div>

      {personalizado && (
        <div className="flex items-center gap-2 mt-2">
          <input
            type="date"
            value={fechaInicio ?? ""}
            onChange={(e) => onChange({ fechaInicio: e.target.value || null, fechaFin })}
            className="gov-card"
            style={{ padding: "6px 8px", fontSize: 13 }}
          />
          <span className="text-gov-muted" style={{ fontSize: 12 }}>a</span>
          <input
            type="date"
            value={fechaFin ?? ""}
            onChange={(e) => onChange({ fechaInicio, fechaFin: e.target.value || null })}
            className="gov-card"
            style={{ padding: "6px 8px", fontSize: 13 }}
          />
        </div>
      )}

      <p className="text-gov-muted mt-1.5" style={{ fontSize: 11 }}>
        Período analizado: {rangoLegible(fechaInicio, fechaFin)}.
      </p>
    </div>
  );
}
