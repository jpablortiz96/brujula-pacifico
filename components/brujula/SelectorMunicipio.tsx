"use client";

import { ChevronDown, Loader2 } from "lucide-react";
import type { MunicipioSeleccionable } from "@/lib/data/municipios-estaticos";

interface Props {
  municipios: MunicipioSeleccionable[];
  value: string | null;
  onChange: (divipola: string) => void;
  label: string;
  excludeDivipola?: string | null;
  loading?: boolean;
}

const NUM = new Intl.NumberFormat("es-CO");

function etiqueta(m: MunicipioSeleccionable): string {
  if (m.contratos == null) return `${m.nombre} â€” ${m.departamento}`;
  const sufijo =
    m.contratos > 0 ? `(${NUM.format(m.contratos)})` : "(sin contratos)";
  return `${m.nombre} — ${m.departamento} ${sufijo}`;
}

export default function SelectorMunicipio({
  municipios,
  value,
  onChange,
  label,
  excludeDivipola,
  loading = false,
}: Props) {
  const opciones = municipios.filter((m) => m.divipola !== excludeDivipola);
  const cargando = loading || municipios.length === 0;

  return (
    <div>
      <label className="gov-label text-gov-muted block mb-1.5" style={{ fontSize: 10 }}>
        {label}
      </label>
      <div className="relative">
        {cargando ? (
          <div
            className="w-full flex items-center gap-2 text-gov-muted"
            style={{
              border: "2px solid rgb(10 37 64 / 0.4)",
              borderRadius: 4,
              padding: "10px 12px",
              fontSize: 14,
              background: "rgb(249 250 251)",
            }}
          >
            <Loader2 size={15} className="animate-spin" />
            Cargando municipios…
          </div>
        ) : (
          <>
            <select
              value={value ?? ""}
              onChange={(e) => onChange(e.target.value)}
              className="w-full appearance-none bg-white text-gov-azul"
              style={{
                border: "2px solid rgb(10 37 64)",
                borderRadius: 4,
                padding: "10px 36px 10px 12px",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              <option value="" disabled>
                Selecciona un municipio
              </option>
              {opciones.map((m) => (
                <option key={m.divipola} value={m.divipola}>
                  {etiqueta(m)}
                </option>
              ))}
            </select>
            <ChevronDown
              size={18}
              className="text-gov-azul absolute pointer-events-none"
              style={{ right: 10, top: "50%", transform: "translateY(-50%)" }}
            />
          </>
        )}
      </div>
    </div>
  );
}
