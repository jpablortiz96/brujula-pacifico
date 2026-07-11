"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import MetricCard from "@/components/brujula/MetricCard";
import MapaZonasOlvidadas from "@/components/brujula/MapaZonasOlvidadas";
import RankingZonas from "@/components/brujula/RankingZonas";
import FichaMunicipio from "@/components/brujula/FichaMunicipio";
import MetodologiaBox from "@/components/brujula/MetodologiaBox";
import BotonExportar from "@/components/brujula/BotonExportar";
import type { ZonaConCoord, ZonaSinDatos } from "@/lib/queries/zonas";
import { formatNum } from "@/lib/zonas-ui";

interface ApiResponse {
  zonas: ZonaConCoord[];
  sin_datos: ZonaSinDatos[];
  error?: string;
  detalle?: string;
}

export default function ZonasClient() {
  const [zonas, setZonas] = useState<ZonaConCoord[]>([]);
  const [sinDatos, setSinDatos] = useState<ZonaSinDatos[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/zonas");
        const json: ApiResponse = await res.json();
        if (!res.ok) throw new Error(json.detalle || json.error || `HTTP ${res.status}`);
        if (cancelled) return;
        setZonas(json.zonas ?? []);
        setSinDatos(json.sin_datos ?? []);
        // Auto-selecciona la zona #1
        if (json.zonas?.length) setSelected(json.zonas[0].divipola);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedZona = useMemo(
    () => zonas.find((z) => z.divipola === selected) ?? null,
    [zonas, selected]
  );

  const abandonoCritico = zonas.filter((z) => z.categoria === "Abandono crítico").length;

  return (
    <div className="max-w-7xl mx-auto w-full space-y-5">
      {/* Breadcrumb + título */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <nav className="flex items-center gap-1 gov-label text-gov-muted mb-2" style={{ fontSize: 10 }}>
            <span>BRÚJULA</span>
            <ChevronRight size={11} />
            <span className="text-gov-azul">Detector de zonas olvidadas</span>
          </nav>
          <h1 className="text-gov-azul" style={{ fontSize: 28, fontWeight: 600, lineHeight: 1.1 }}>
            Detector de zonas olvidadas
          </h1>
          <p className="text-gov-muted mt-1" style={{ fontSize: 14, maxWidth: 720 }}>
            Municipios del Pacífico con alta vulnerabilidad y baja inversión
            pública. Metodología rigurosa con factor de expansión del DANE.
          </p>
        </div>
        {!loading && zonas.length > 0 && (
          <div style={{ width: 260, flexShrink: 0 }}>
            <BotonExportar tipo="zonas" label="Exportar como dato abierto" />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div
          className="p-4 gov-mono"
          style={{ border: "2px solid rgb(206 17 38)", borderRadius: 4, color: "rgb(206 17 38)", fontSize: 13 }}
        >
          ⚠️ No se pudo cargar el detector: {error}
        </div>
      )}

      {/* Métricas resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MetricCard
          label="Zonas en abandono crítico"
          value={loading ? "—" : abandonoCritico}
          variant="rojo"
          loading={loading}
          sublabel="Sin contratos + alta vulnerabilidad"
        />
        <MetricCard
          label="Municipios analizados"
          value={loading ? "—" : zonas.length}
          variant="azul"
          loading={loading}
          sublabel="Con muestra Sisbén ≥30"
        />
        <MetricCard
          label="Requieren verificación"
          value={loading ? "—" : sinDatos.length}
          variant="amarillo"
          loading={loading}
          sublabel="Muestra insuficiente, no rankeados"
        />
      </div>

      {/* Mapa + Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div
          className="lg:col-span-3 bg-white overflow-hidden"
          style={{ border: "2px solid rgb(10 37 64)", borderRadius: 4, height: 520 }}
        >
          {loading ? (
            <Skeleton label="Cargando mapa territorial…" />
          ) : (
            <MapaZonasOlvidadas
              zonas={zonas}
              selectedDivipola={selected}
              onSelect={setSelected}
            />
          )}
        </div>
        <div
          className="lg:col-span-2 bg-white overflow-hidden"
          style={{ border: "2px solid rgb(10 37 64)", borderRadius: 4, height: 520 }}
        >
          {loading ? (
            <Skeleton label="Cargando ranking…" />
          ) : (
            <RankingZonas
              zonas={zonas}
              selectedDivipola={selected}
              onSelect={setSelected}
            />
          )}
        </div>
      </div>

      {/* Ficha + Metodología */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <FichaMunicipio zona={selectedZona} />
        <MetodologiaBox />
      </div>

      {/* Requieren verificación */}
      <details
        className="bg-white group"
        style={{ border: "2px solid rgb(10 37 64)", borderRadius: 4 }}
      >
        <summary
          className="flex items-center gap-2 px-4 py-3 cursor-pointer select-none"
          style={{ listStyle: "none" }}
        >
          <ChevronRight
            size={16}
            className="text-gov-azul transition-transform group-open:rotate-90"
          />
          <span className="text-gov-azul" style={{ fontSize: 15, fontWeight: 600 }}>
            Municipios que requieren verificación de datos
          </span>
          <span className="gov-pill" style={{ background: "rgb(255 205 0)", color: "rgb(10 37 64)" }}>
            {sinDatos.length}
          </span>
        </summary>
        <div className="px-4 pb-4 pt-1" style={{ borderTop: "0.5px solid rgb(10 37 64 / 0.15)" }}>
          <p className="text-gov-muted my-3" style={{ fontSize: 13, maxWidth: 760 }}>
            Estos municipios tienen muestra Sisbén insuficiente (&lt;30 registros)
            y baja contratación (&lt;10 contratos). Se excluyen del ranking para
            no reportar artefactos de muestreo como olvido — requieren
            verificación de datos en vivo antes de concluir.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full" style={{ fontSize: 13, borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Municipio", "Departamento", "Contratos", "Homicidios"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-3 py-2 gov-label text-white bg-gov-azul"
                      style={{ fontSize: 10 }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sinDatos.map((z, i) => (
                  <tr key={z.divipola} style={{ background: i % 2 ? "rgb(244 242 236)" : "#fff" }}>
                    <td className="px-3 py-1.5 text-gov-azul" style={{ fontWeight: 500 }}>{z.nombre}</td>
                    <td className="px-3 py-1.5 text-gov-muted">{z.departamento}</td>
                    <td className="px-3 py-1.5 tabular-nums">{formatNum(z.contratos)}</td>
                    <td className="px-3 py-1.5 tabular-nums">{formatNum(z.homicidios)}</td>
                  </tr>
                ))}
                {sinDatos.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-3 text-gov-muted text-center">
                      Ninguno.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </details>
    </div>
  );
}

function Skeleton({ label }: { label: string }) {
  return (
    <div className="h-full flex items-center justify-center bg-gov-bone animate-pulse">
      <p className="gov-label text-gov-muted" style={{ fontSize: 11 }}>
        {label}
      </p>
    </div>
  );
}
