"use client";

import dynamic from "next/dynamic";
import type { ZonaConCoord } from "@/lib/queries/zonas";

const ZonasMapInner = dynamic(() => import("./ZonasMapInner"), {
  ssr: false,
  loading: () => (
    <div
      className="flex items-center justify-center bg-gov-bone"
      style={{ height: "100%", minHeight: 480 }}
    >
      <p className="gov-label text-gov-muted" style={{ fontSize: 11 }}>
        Cargando mapa…
      </p>
    </div>
  ),
});

interface Props {
  zonas: ZonaConCoord[];
  selectedDivipola: string | null;
  onSelect: (divipola: string) => void;
}

const LEYENDA = [
  { color: "rgb(206,17,38)", label: "Abandono crítico" },
  { color: "#EF9F27", label: "Alto olvido" },
  { color: "rgb(255,205,0)", label: "Olvido moderado" },
  { color: "rgb(26,135,84)", label: "Atención normal" },
];

export default function MapaZonasOlvidadas({
  zonas,
  selectedDivipola,
  onSelect,
}: Props) {
  const conCoord = zonas.filter((z) => z.lat != null && z.lng != null);

  return (
    <div className="relative" style={{ height: "100%", minHeight: 480 }}>
      <ZonasMapInner
        zonas={zonas}
        selectedDivipola={selectedDivipola}
        onSelect={onSelect}
      />

      {zonas.length > 0 && conCoord.length === 0 && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-gov-bone/80 pointer-events-none"
          style={{ zIndex: 1000 }}
        >
          <p className="gov-label text-gov-muted" style={{ fontSize: 12 }}>
            Sin coordenadas para las zonas rankeadas
          </p>
        </div>
      )}

      {/* Leyenda */}
      <div
        className="absolute bg-white"
        style={{
          bottom: 24,
          right: 12,
          zIndex: 999,
          border: "0.5px solid rgb(10 37 64)",
          borderRadius: 4,
          padding: "7px 10px",
          fontSize: 11,
          lineHeight: 1.7,
          pointerEvents: "none",
        }}
      >
        <p
          style={{
            fontWeight: 500,
            marginBottom: 4,
            fontSize: 10,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "rgb(92 107 122)",
          }}
        >
          Tamaño = nivel de olvido
        </p>
        {LEYENDA.map(({ color, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: color,
                flexShrink: 0,
              }}
            />
            <span style={{ color: "rgb(10 37 64)" }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
