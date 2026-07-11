"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup } from "react-leaflet";
import type { MunicipioStats } from "@/types/brujula";

const COP = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });

function markerColor(valor: number): { stroke: string; fill: string } {
  if (valor > 10_000_000_000)
    return { stroke: "rgba(206,17,38,1)", fill: "rgba(206,17,38,0.55)" };
  if (valor > 1_000_000_000)
    return { stroke: "rgba(200,160,0,1)", fill: "rgba(255,205,0,0.55)" };
  return { stroke: "rgba(20,110,68,1)", fill: "rgba(26,135,84,0.55)" };
}

function markerRadius(contratos: number): number {
  return Math.min(6 + Math.log10(contratos + 1) * 6, 28);
}

interface Props {
  stats: MunicipioStats[];
  onMunicipioClick?: (m: MunicipioStats) => void;
}

export default function LeafletMapInner({ stats, onMunicipioClick }: Props) {
  const points = stats.filter(
    (m): m is MunicipioStats & { lat: number; lng: number } =>
      m.lat !== null && m.lng !== null
  );

  return (
    <MapContainer
      center={[3.5, -77.0]}
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
      {points.map((m) => {
        const { stroke, fill } = markerColor(m.valor_total);
        return (
          <CircleMarker
            key={m.divipola}
            center={[m.lat, m.lng]}
            radius={markerRadius(m.contratos)}
            pathOptions={{
              color: stroke,
              fillColor: fill,
              fillOpacity: 0.55,
              weight: 1.5,
            }}
            eventHandlers={{
              click: () => onMunicipioClick?.(m),
            }}
          >
            <Tooltip>
              <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                <strong>{m.nombre}</strong>
                <br />
                <span style={{ color: "#666" }}>{m.departamento}</span>
                <br />
                {m.contratos.toLocaleString("es-CO")} contratos
                <br />${COP.format(m.valor_total / 1e9)} mil millones COP
              </div>
            </Tooltip>
            <Popup>
              <div style={{ fontSize: 13, minWidth: 160 }}>
                <p style={{ fontWeight: 600, marginBottom: 2 }}>{m.nombre}</p>
                <p style={{ color: "#666", fontSize: 11, marginBottom: 6 }}>
                  {m.departamento}
                </p>
                <p>{m.contratos.toLocaleString("es-CO")} contratos</p>
                <p>${COP.format(m.valor_total / 1e9)} mil millones COP</p>
                {onMunicipioClick && (
                  <button
                    style={{
                      marginTop: 8,
                      fontSize: 11,
                      textDecoration: "underline",
                      color: "rgb(10,37,64)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                    }}
                    onClick={() => onMunicipioClick(m)}
                  >
                    Ver detalles
                  </button>
                )}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
