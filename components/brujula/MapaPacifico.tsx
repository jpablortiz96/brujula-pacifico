"use client";

import dynamic from "next/dynamic";
import type { MunicipioStats } from "@/types/brujula";

const LeafletMapInner = dynamic(() => import("./LeafletMapInner"), {
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

// Bounding box de Colombia
const LAT_MIN = -4.3, LAT_MAX = 13.0;
const LNG_MIN = -82.0, LNG_MAX = -66.0;

interface Props {
  stats: MunicipioStats[];
  onMunicipioClick?: (m: MunicipioStats) => void;
}

export default function MapaPacifico({ stats, onMunicipioClick }: Props) {
  // Filtra coordenadas nulas o fuera de Colombia
  const validStats = stats.filter(
    (s) =>
      s.lat != null &&
      s.lng != null &&
      s.lat >= LAT_MIN &&
      s.lat <= LAT_MAX &&
      s.lng >= LNG_MIN &&
      s.lng <= LNG_MAX
  );

  return (
    <div className="relative" style={{ height: "100%", minHeight: 480 }}>
      <LeafletMapInner stats={validStats} onMunicipioClick={onMunicipioClick} />

      {/* Empty state overlay */}
      {stats.length > 0 && validStats.length === 0 && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-gov-bone/80 pointer-events-none"
          style={{ zIndex: 1000 }}
        >
          <p className="gov-label text-gov-muted" style={{ fontSize: 12 }}>
            Sin contratos para este filtro
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
        <p style={{ fontWeight: 500, marginBottom: 4, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgb(92 107 122)" }}>
          Tamaño = N° contratos
        </p>
        {[
          { color: "rgb(26,135,84)",  label: "< $1 B COP"   },
          { color: "rgb(200,160,0)",  label: "$1 B – $10 B" },
          { color: "rgb(206,17,38)",  label: "> $10 B COP"  },
        ].map(({ color, label }) => (
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
