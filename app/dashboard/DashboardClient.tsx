"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  DashboardFilters,
  DashboardKPIs,
  MunicipioStats,
  ContratoSecop,
} from "@/types/brujula";
import FiltersBar from "@/components/brujula/FiltersBar";
import MetricCard from "@/components/brujula/MetricCard";
import MapaPacifico from "@/components/brujula/MapaPacifico";
import TablaContratos from "@/components/brujula/TablaContratos";
import { useRol } from "@/lib/context/RolContext";

const PAGE_SIZE = 25;

function buildQS(
  filters: DashboardFilters,
  extra: Record<string, string | number> = {}
): string {
  const p = new URLSearchParams();
  if (filters.departamento) p.set("departamento", filters.departamento);
  if (filters.fechaInicio)  p.set("fechaInicio",  filters.fechaInicio);
  if (filters.fechaFin)     p.set("fechaFin",     filters.fechaFin);
  if (filters.valorMin != null) p.set("valorMin", String(filters.valorMin));
  if (filters.valorMax != null) p.set("valorMax", String(filters.valorMax));
  if (filters.busqueda)    p.set("busqueda",     filters.busqueda);
  for (const [k, v] of Object.entries(extra)) p.set(k, String(v));
  return p.toString();
}

const FMT = new Intl.NumberFormat("es-CO");

function fmtNum(n: number) { return FMT.format(n); }
function fmtBil(n: number) { return `$${(n / 1e9).toFixed(1)} B COP`; }

export default function DashboardClient() {
  const { rol } = useRol();
  const ciudadano = rol === "ciudadano";
  const [filters, setFilters] = useState<DashboardFilters>({});
  const [page, setPage]       = useState(0);

  const [kpis, setKpis]               = useState<DashboardKPIs | null>(null);
  const [muniStats, setMuniStats]     = useState<MunicipioStats[]>([]);
  const [contratos, setContratos]     = useState<ContratoSecop[]>([]);
  const [contratosTotal, setTotal]    = useState(0);

  const [loadingKpis,  setLKpis]  = useState(true);
  const [loadingMap,   setLMap]   = useState(true);
  const [loadingTable, setLTable] = useState(true);

  const fetchAll = useCallback(async (f: DashboardFilters, p: number) => {
    setLKpis(true); setLMap(true); setLTable(true);

    try {
      const qs       = buildQS(f);
      const tableQS  = buildQS(f, { page: p, pageSize: PAGE_SIZE });

      const [kpisRes, muniRes, ctRes] = await Promise.all([
        fetch(`/api/dashboard/kpis?${qs}`),
        fetch(`/api/dashboard/municipios?${qs}`),
        fetch(`/api/dashboard/contratos?${tableQS}`),
      ]);

      const [kpisData, muniData, ctData] = await Promise.all([
        kpisRes.json(),
        muniRes.json(),
        ctRes.json(),
      ]);

      setKpis(kpisData as DashboardKPIs);
      setLKpis(false);

      setMuniStats(Array.isArray(muniData) ? (muniData as MunicipioStats[]) : []);
      setLMap(false);

      setContratos(Array.isArray(ctData.rows) ? (ctData.rows as ContratoSecop[]) : []);
      setTotal(typeof ctData.total === "number" ? ctData.total : 0);
      setLTable(false);
    } catch (err) {
      console.error("[DashboardClient]", err);
      setLKpis(false); setLMap(false); setLTable(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchAll(filters, page);
  }, [filters, page, fetchAll]);

  const handleFiltersChange = useCallback((f: DashboardFilters) => {
    setFilters(f);
    setPage(0);
  }, []);

  const top10 = [...muniStats]
    .sort((a, b) => b.valor_total - a.valor_total)
    .slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Breadcrumb + título */}
      <div>
        <nav className="text-gov-muted mb-1" style={{ fontSize: 12 }}>
          Inicio <span className="mx-1">›</span> Dashboard{" "}
          <span className="mx-1">›</span> Pacífico colombiano
        </nav>
        <h1
          className="text-gov-azul tracking-tight"
          style={{ fontSize: 24, fontWeight: 500 }}
        >
          Pacífico colombiano
        </h1>
        <p className="text-gov-muted mt-0.5" style={{ fontSize: 14 }}>
          Cauca · Chocó · Nariño · Valle del Cauca
          {kpis && (
            <>
              {" "}· {fmtNum(kpis.total_contratos)} contratos · 4 departamentos
            </>
          )}
        </p>
      </div>

      {/* Filtros */}
      <FiltersBar onFiltersChange={handleFiltersChange} />

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Contratos"
          value={kpis ? fmtNum(kpis.total_contratos) : "—"}
          sublabel={
            kpis
              ? `${kpis.fecha_min?.slice(0, 4) ?? "—"} – ${kpis.fecha_max?.slice(0, 4) ?? "—"}`
              : undefined
          }
          variant="azul"
          loading={loadingKpis}
        />
        <MetricCard
          label="Valor total contratado"
          value={kpis ? fmtBil(kpis.valor_total_cop) : "—"}
          sublabel="miles de millones COP"
          variant="amarillo"
          loading={loadingKpis}
        />
        <MetricCard
          label="Municipios"
          value={kpis ? fmtNum(kpis.municipios_cubiertos) : "—"}
          sublabel={ciudadano ? "municipios con datos" : "/ 178 catalogados"}
          variant="verde"
          loading={loadingKpis}
        />
        <MetricCard
          label="Entidades"
          value={kpis ? fmtNum(kpis.entidades_distintas) : "—"}
          sublabel={ciudadano ? "entidades que contratan" : "contratantes únicas"}
          variant="azul"
          loading={loadingKpis}
        />
      </div>

      {/* Mapa + Top 10 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Mapa */}
        <div
          className="lg:col-span-3 bg-white overflow-hidden"
          style={{ border: "2px solid rgb(10 37 64)", borderRadius: 4 }}
        >
          <div
            className="px-4 py-3"
            style={{ borderBottom: "1px solid rgba(10,37,64,0.15)" }}
          >
            <h2 className="gov-label text-gov-azul" style={{ fontSize: 11 }}>
              Mapa de inversión pública
            </h2>
          </div>
          <div style={{ height: 480 }}>
            {loadingMap && muniStats.length === 0 ? (
              <div
                className="flex items-center justify-center bg-gov-bone"
                style={{ height: 480 }}
              >
                <p className="gov-label text-gov-muted" style={{ fontSize: 11 }}>
                  Cargando datos del mapa…
                </p>
              </div>
            ) : (
              <MapaPacifico stats={muniStats} />
            )}
          </div>
        </div>

        {/* Top 10 */}
        <div
          className="lg:col-span-2 bg-white flex flex-col overflow-hidden"
          style={{ border: "2px solid rgb(10 37 64)", borderRadius: 4 }}
        >
          <div
            className="px-4 py-3 flex-shrink-0"
            style={{ borderBottom: "1px solid rgba(10,37,64,0.15)" }}
          >
            <h2 className="gov-label text-gov-azul" style={{ fontSize: 11 }}>
              Top 10 municipios
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {top10.length === 0 && !loadingMap ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-gov-muted text-sm">Sin datos</p>
              </div>
            ) : (
              top10.map((m, i) => (
                <div
                  key={m.divipola}
                  className="px-4 py-2.5 flex items-center gap-3"
                  style={{ borderBottom: "0.5px solid rgba(10,37,64,0.08)" }}
                >
                  <span
                    className="gov-mono text-gov-muted text-right flex-shrink-0"
                    style={{ fontSize: 12, width: 18 }}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className="font-medium text-gov-azul truncate"
                      style={{ fontSize: 13 }}
                    >
                      {m.nombre}
                    </p>
                    <p className="text-gov-muted truncate" style={{ fontSize: 11 }}>
                      {m.departamento}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="gov-mono font-medium" style={{ fontSize: 12 }}>
                      {fmtNum(m.contratos)}
                    </p>
                    <p className="text-gov-muted" style={{ fontSize: 11 }}>
                      ${(m.valor_total / 1e9).toFixed(1)} B
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Tabla contratos */}
      <div
        className="bg-white overflow-hidden"
        style={{ border: "2px solid rgb(10 37 64)", borderRadius: 4 }}
      >
        <div
          className="px-4 py-3"
          style={{ borderBottom: "1px solid rgba(10,37,64,0.15)" }}
        >
          <h2 className="gov-label text-gov-azul" style={{ fontSize: 11 }}>
            Contratos SECOP
          </h2>
        </div>
        <TablaContratos
          rows={contratos}
          total={contratosTotal}
          page={page}
          pageSize={PAGE_SIZE}
          loading={loadingTable}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
