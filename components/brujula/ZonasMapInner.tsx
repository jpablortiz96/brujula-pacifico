"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import type { ZonaConCoord } from "@/lib/queries/zonas";
import { categoriaStyle } from "@/lib/zonas-ui";

interface Props {
  zonas: ZonaConCoord[];
  selectedDivipola: string | null;
  onSelect: (divipola: string) => void;
}

/** radio 8–26 según score de olvido (0–1). */
function radius(score: number): number {
  return 8 + Math.max(0, Math.min(1, score)) * 18;
}

export default function ZonasMapInner({ zonas, selectedDivipola, onSelect }: Props) {
  const points = zonas.filter(
    (z): z is ZonaConCoord & { lat: number; lng: number } =>
      z.lat !== null && z.lng !== null
  );

  return (
    <MapContainer
      center={[3.5, -76.8]}
      zoom={7}
      minZoom={6}
      maxZoom={12}
      maxBounds={[[-1, -82], [9, -73]]}
      maxBoundsViscosity={0.8}
      style={{ height: "100%", minHeight: 480, width: "100%" }}
      className="z-0"
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        maxZoom={19}
      />
      {points.map((z) => {
        const { stroke, fill } = categoriaStyle(z.categoria);
        const selected = z.divipola === selectedDivipola;
        return (
          <CircleMarker
            key={z.divipola}
            center={[z.lat, z.lng]}
            radius={radius(z.score_olvido)}
            pathOptions={{
              color: selected ? "#ffffff" : stroke,
              fillColor: fill,
              fillOpacity: 0.6,
              weight: selected ? 3 : 1.5,
            }}
            eventHandlers={{ click: () => onSelect(z.divipola) }}
          >
            <Tooltip>
              <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                <strong>{z.nombre}</strong>
                <br />
                <span style={{ color: "#666" }}>{z.departamento}</span>
                <br />
                Score olvido: {z.score_olvido.toFixed(3)}
                <br />
                <span style={{ color: "#666" }}>{z.categoria}</span>
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
