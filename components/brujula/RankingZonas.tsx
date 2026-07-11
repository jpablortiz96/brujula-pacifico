"use client";

import type { ZonaOlvidada } from "@/lib/queries/zonas";
import { categoriaStyle } from "@/lib/zonas-ui";

interface Props {
  zonas: ZonaOlvidada[];
  selectedDivipola: string | null;
  onSelect: (divipola: string) => void;
}

export default function RankingZonas({
  zonas,
  selectedDivipola,
  onSelect,
}: Props) {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div
        className="px-4 py-3 flex-shrink-0"
        style={{ borderBottom: "0.5px solid rgb(10 37 64 / 0.2)" }}
      >
        <h3 className="text-gov-azul" style={{ fontSize: 15, fontWeight: 600 }}>
          Ranking de olvido territorial
        </h3>
        <p className="gov-label text-gov-muted mt-0.5" style={{ fontSize: 10 }}>
          Ordenado por score compuesto
        </p>
      </div>

      {/* Lista */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {zonas.map((z, i) => {
          const cat = categoriaStyle(z.categoria);
          const selected = z.divipola === selectedDivipola;
          return (
            <button
              key={z.divipola}
              type="button"
              onClick={() => onSelect(z.divipola)}
              className="w-full text-left flex items-center gap-3 px-3 py-2.5 transition-colors"
              style={{
                borderBottom: "0.5px solid rgb(10 37 64 / 0.1)",
                borderLeft: selected
                  ? "4px solid rgb(255 205 0)"
                  : "4px solid transparent",
                background: selected ? "rgb(244 242 236)" : "#fff",
              }}
              onMouseEnter={(e) => {
                if (!selected) e.currentTarget.style.background = "rgb(249 250 251)";
              }}
              onMouseLeave={(e) => {
                if (!selected) e.currentTarget.style.background = "#fff";
              }}
            >
              <span
                className="gov-mono text-gov-muted flex-shrink-0 tabular-nums"
                style={{ fontSize: 13, width: 22 }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>

              <div className="min-w-0 flex-1">
                <p
                  className="text-gov-azul truncate"
                  style={{ fontSize: 14, fontWeight: 500 }}
                >
                  {z.nombre}
                </p>
                <p className="text-gov-muted truncate" style={{ fontSize: 11 }}>
                  {z.departamento}
                </p>
                {/* Barra de score */}
                <div
                  className="mt-1.5"
                  style={{ height: 5, background: "rgb(229 231 235)", borderRadius: 2 }}
                >
                  <div
                    style={{
                      width: `${Math.max(0, Math.min(1, z.score_olvido)) * 100}%`,
                      height: "100%",
                      background: cat.solid,
                      borderRadius: 2,
                    }}
                  />
                </div>
              </div>

              <span
                className="gov-mono text-gov-azul flex-shrink-0 tabular-nums"
                style={{ fontSize: 13, fontWeight: 600 }}
              >
                {z.score_olvido.toFixed(3)}
              </span>
            </button>
          );
        })}

        {zonas.length === 0 && (
          <p className="text-gov-muted text-center p-6" style={{ fontSize: 13 }}>
            No hay zonas rankeadas.
          </p>
        )}
      </div>
    </div>
  );
}
