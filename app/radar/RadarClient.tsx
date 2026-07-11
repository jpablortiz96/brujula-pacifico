"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Radar, Search, ExternalLink, Loader2 } from "lucide-react";
import FiltroPeriodo, { type Periodo } from "@/components/brujula/FiltroPeriodo";
import { formatCOPCompact, formatNum } from "@/lib/zonas-ui";
import type { CruceSectorial } from "@/lib/queries/sectores";

type Tab = "Educación" | "Seguridad y justicia" | "Salud";
const TABS: { id: Tab; label: string }[] = [
  { id: "Educación", label: "Educación" },
  { id: "Seguridad y justicia", label: "Seguridad" },
  { id: "Salud", label: "Salud" },
];

const UNIDAD: Record<string, { sing: string; plur: string }> = {
  "Educación": { sing: "sede educativa", plur: "sedes educativas" },
  "Seguridad y justicia": { sing: "homicidio", plur: "homicidios" },
};

interface DatasetViva { id: string; nombre: string; entidad: string; url: string; descripcion?: string }

export default function RadarClient() {
  const [tab, setTab] = useState<Tab>("Educación");
  const [periodo, setPeriodo] = useState<Periodo>({ fechaInicio: null, fechaFin: null });
  const [datos, setDatos] = useState<CruceSectorial[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [datasets, setDatasets] = useState<DatasetViva[] | null>(null);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ sector: tab });
        if (periodo.fechaInicio) params.set("fechaInicio", periodo.fechaInicio);
        if (periodo.fechaFin) params.set("fechaFin", periodo.fechaFin);
        const res = await fetch(`/api/sectores?${params.toString()}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.detalle || json.error || `HTTP ${res.status}`);
        if (!cancel) setDatos(json.municipios ?? []);
      } catch (err) {
        if (!cancel) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [tab, periodo]);

  async function buscarSalud() {
    setBuscando(true);
    try {
      const res = await fetch(`/api/buscar-dataset?q=${encodeURIComponent("salud Pacífico")}`);
      const json = await res.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ds = (json.datasets_encontrados ?? []).map((d: any) => ({
        id: d.id, nombre: d.nombre, entidad: d.entidad, url: d.url, descripcion: d.descripcion,
      }));
      setDatasets(ds);
    } catch {
      setDatasets([]);
    } finally {
      setBuscando(false);
    }
  }

  const conIndicador = tab !== "Salud";
  const unidad = UNIDAD[tab];

  // Bloque 1: registran indicador pero $0 de inversión.
  const sinInversion = useMemo(
    () => datos
      .filter((m) => m.inversion_sector_cop === 0 && (m.indicador_resultado ?? 0) > 0)
      .sort((a, b) => (b.indicador_resultado ?? 0) - (a.indicador_resultado ?? 0))
      .slice(0, 10),
    [datos]
  );

  // Bloque 2: sí tienen inversión → ordenados por menos pesos por unidad.
  const desbalance = useMemo(() => {
    const conInv = datos.filter((m) => m.inversion_sector_cop > 0);
    if (!conIndicador) return conInv.sort((a, b) => b.inversion_sector_cop - a.inversion_sector_cop).slice(0, 20);
    return conInv
      .map((m) => ({ ...m, porUnidad: m.inversion_sector_cop / Math.max(m.indicador_resultado ?? 0, 1) }))
      .sort((a, b) => a.porUnidad - b.porUnidad)
      .slice(0, 12);
  }, [datos, conIndicador]);

  const hallazgo = useMemo(() => construirHallazgo(tab, datos, unidad), [tab, datos, unidad]);

  return (
    <div className="max-w-5xl mx-auto w-full space-y-5">
      <div>
        <nav className="flex items-center gap-1 gov-label text-gov-muted mb-2" style={{ fontSize: 10 }}>
          <span>BRÚJULA</span>
          <ChevronRight size={11} />
          <span className="text-gov-azul">Radar sectorial</span>
        </nav>
        <h1 className="flex items-center gap-2 text-gov-azul" style={{ fontSize: 26, fontWeight: 600, lineHeight: 1.1 }}>
          <Radar size={24} /> Radar sectorial del Pacífico
        </h1>
        <p className="text-gov-muted mt-1" style={{ fontSize: 14, maxWidth: 640 }}>
          ¿La inversión pública llega donde más se necesita? Cruzamos el gasto por sector con los indicadores de resultado.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-0" style={{ border: "2px solid rgb(10 37 64)", borderRadius: 4, overflow: "hidden", width: "fit-content" }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className="px-5 py-2 transition-colors"
            style={{
              background: tab === t.id ? "rgb(10 37 64)" : "#fff",
              color: tab === t.id ? "#fff" : "rgb(10 37 64)",
              fontSize: 14, fontWeight: 600,
              borderRight: t.id !== "Salud" ? "2px solid rgb(10 37 64)" : undefined,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <FiltroPeriodo fechaInicio={periodo.fechaInicio} fechaFin={periodo.fechaFin} onChange={setPeriodo} />

      {error && (
        <div className="p-4 gov-mono" style={{ border: "2px solid rgb(206 17 38)", borderRadius: 4, color: "rgb(206 17 38)", fontSize: 13 }}>⚠️ {error}</div>
      )}

      {!loading && hallazgo && (
        <div className="p-4" style={{ border: "2px solid rgb(10 37 64)", borderLeft: "6px solid rgb(255 205 0)", borderRadius: 4, background: "#fff" }}>
          <p className="gov-label text-gov-muted mb-1" style={{ fontSize: 10 }}>Hallazgo</p>
          <p className="text-gov-azul" style={{ fontSize: 15, lineHeight: 1.5 }}>{hallazgo}</p>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center animate-pulse text-gov-muted" style={{ fontSize: 13 }}>Cargando {tab}…</div>
      ) : tab === "Salud" ? (
        <SaludPanel datos={desbalance} datasets={datasets} buscando={buscando} onBuscar={buscarSalud} />
      ) : (
        <>
          {/* Bloque 1 — sin inversión */}
          {sinInversion.length > 0 && (
            <div style={{ border: "2px solid rgb(206 17 38)", borderRadius: 4, overflow: "hidden" }}>
              <div className="px-4 py-2.5" style={{ background: "rgba(206,17,38,0.07)" }}>
                <p className="text-gov-azul" style={{ fontSize: 13, fontWeight: 600 }}>Sin inversión sectorial registrada</p>
                <p className="text-gov-muted" style={{ fontSize: 11.5, lineHeight: 1.4 }}>
                  Estos municipios registran {unidad.plur} pero ninguna inversión del sector en SECOP.
                  Puede ser abandono real o inversión gestionada desde el nivel departamental.
                </p>
              </div>
              <table className="w-full" style={{ fontSize: 12.5, borderCollapse: "collapse" }}>
                <thead>
                  <tr>{["Municipio", "Depto", unidad.plur].map((c) => (
                    <th key={c} className="text-left px-3 py-2 gov-label text-white bg-gov-azul" style={{ fontSize: 9 }}>{c}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {sinInversion.map((m, i) => (
                    <tr key={m.divipola} style={{ background: i % 2 ? "rgba(206,17,38,0.04)" : "#fff" }}>
                      <td className="px-3 py-1.5 text-gov-azul" style={{ fontWeight: 500 }}>{m.nombre}</td>
                      <td className="px-3 py-1.5 text-gov-muted">{m.departamento}</td>
                      <td className="px-3 py-1.5 tabular-nums" style={{ fontWeight: 600 }}>{formatNum(m.indicador_resultado ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Bloque 2 — desbalance */}
          <div style={{ border: "2px solid rgb(10 37 64)", borderRadius: 4, overflow: "hidden" }}>
            <div className="px-4 py-2.5 bg-white" style={{ borderBottom: "0.5px solid rgb(10 37 64 / 0.2)" }}>
              <p className="text-gov-azul" style={{ fontSize: 13, fontWeight: 600 }}>Desbalance de inversión</p>
              <p className="text-gov-muted" style={{ fontSize: 11.5, lineHeight: 1.4 }}>
                Entre los municipios que sí reciben inversión, estos son los que menos invierten por {unidad.sing}.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full" style={{ fontSize: 12.5, borderCollapse: "collapse" }}>
                <thead>
                  <tr>{["Municipio", "Depto", "Inversión", "Contr.", unidad.plur, `Inv. por ${unidad.sing}`].map((c) => (
                    <th key={c} className="text-left px-3 py-2 gov-label text-white bg-gov-azul" style={{ fontSize: 9 }}>{c}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {desbalance.map((m, i) => {
                    const porUnidad = m.inversion_sector_cop / Math.max(m.indicador_resultado ?? 0, 1);
                    return (
                      <tr key={m.divipola} style={{ background: i % 2 ? "rgb(244 242 236)" : "#fff" }}>
                        <td className="px-3 py-1.5 text-gov-azul" style={{ fontWeight: 500 }}>{m.nombre}</td>
                        <td className="px-3 py-1.5 text-gov-muted">{m.departamento}</td>
                        <td className="px-3 py-1.5 tabular-nums">{formatCOPCompact(m.inversion_sector_cop)}</td>
                        <td className="px-3 py-1.5 tabular-nums">{formatNum(m.contratos_sector)}</td>
                        <td className="px-3 py-1.5 tabular-nums">{formatNum(m.indicador_resultado ?? 0)}</td>
                        <td className="px-3 py-1.5 tabular-nums" style={{ fontWeight: 600 }}>{formatCOPCompact(porUnidad)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <NotaMetodo />
    </div>
  );
}

function SaludPanel({
  datos, datasets, buscando, onBuscar,
}: {
  datos: CruceSectorial[];
  datasets: DatasetViva[] | null;
  buscando: boolean;
  onBuscar: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="p-3" style={{ border: "0.5px solid rgb(10 37 64)", borderLeft: "4px solid rgb(43 122 155)", borderRadius: 4, background: "#fff" }}>
        <p className="text-gov-azul" style={{ fontSize: 13.5, lineHeight: 1.5 }}>
          No tenemos pre-cargados indicadores de resultado en salud. BRÚJULA puede buscarlos en vivo en el catálogo de datos.gov.co.
        </p>
        <button type="button" onClick={onBuscar} disabled={buscando} className="mt-3 flex items-center gap-2" style={{ background: "rgb(10 37 64)", color: "#fff", borderRadius: 4, padding: "8px 14px", fontSize: 13, fontWeight: 600 }}>
          {buscando ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
          Buscar datos de salud en datos.gov.co
        </button>
      </div>

      {datasets && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {datasets.length === 0 && <p className="text-gov-muted" style={{ fontSize: 13 }}>No se encontraron datasets.</p>}
          {datasets.map((d) => (
            <a key={d.id} href={d.url} target="_blank" rel="noopener noreferrer" className="p-3 block" style={{ border: "0.5px solid rgb(10 37 64)", borderRadius: 4, background: "#fff" }}>
              <p className="text-gov-azul" style={{ fontSize: 13.5, fontWeight: 600 }}>{d.nombre}</p>
              <p className="text-gov-muted mt-0.5" style={{ fontSize: 11 }}>{d.entidad}</p>
              <span className="inline-flex items-center gap-1 mt-1" style={{ fontSize: 11, color: "rgb(0 51 168)" }}>
                <ExternalLink size={11} /> datos.gov.co/d/{d.id}
              </span>
            </a>
          ))}
        </div>
      )}

      {/* Ranking de inversión en salud */}
      <div className="overflow-x-auto" style={{ border: "2px solid rgb(10 37 64)", borderRadius: 4 }}>
        <table className="w-full" style={{ fontSize: 12.5, borderCollapse: "collapse" }}>
          <thead>
            <tr>{["Municipio", "Depto", "Inversión en salud", "Contratos", "Per cápita"].map((c) => (
              <th key={c} className="text-left px-3 py-2 gov-label text-white bg-gov-azul" style={{ fontSize: 9 }}>{c}</th>
            ))}</tr>
          </thead>
          <tbody>
            {datos.map((m, i) => (
              <tr key={m.divipola} style={{ background: i % 2 ? "rgb(244 242 236)" : "#fff" }}>
                <td className="px-3 py-1.5 text-gov-azul" style={{ fontWeight: 500 }}>{m.nombre}</td>
                <td className="px-3 py-1.5 text-gov-muted">{m.departamento}</td>
                <td className="px-3 py-1.5 tabular-nums">{formatCOPCompact(m.inversion_sector_cop)}</td>
                <td className="px-3 py-1.5 tabular-nums">{formatNum(m.contratos_sector)}</td>
                <td className="px-3 py-1.5 tabular-nums">{m.inversion_per_capita != null ? formatCOPCompact(m.inversion_per_capita) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NotaMetodo() {
  return (
    <div className="p-3" style={{ borderLeft: "4px solid rgb(255 205 0)", background: "rgb(249 250 251)", borderRadius: 4 }}>
      <p className="text-gov-muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
        El sector se infiere automáticamente del objeto contractual mediante análisis de texto.
        La clasificación es aproximada y verificable en SECOP. El indicador de resultado (sedes,
        homicidios) es acumulado y no se filtra por período; la inversión sí.
      </p>
    </div>
  );
}

function construirHallazgo(
  tab: Tab,
  datos: CruceSectorial[],
  unidad: { sing: string; plur: string } | undefined
): string {
  if (datos.length === 0 || !unidad) {
    if (tab === "Salud" && datos.length > 0) {
      const top = [...datos].sort((a, b) => b.inversion_sector_cop - a.inversion_sector_cop)[0];
      return `${top.nombre} concentra la mayor inversión en salud del Pacífico (${formatCOPCompact(top.inversion_sector_cop)}).`;
    }
    return "";
  }
  const conIndicador = datos.filter((m) => (m.indicador_resultado ?? 0) > 0);
  const sinInv = conIndicador.filter((m) => m.inversion_sector_cop === 0);
  const extremo = [...sinInv].sort((a, b) => (b.indicador_resultado ?? 0) - (a.indicador_resultado ?? 0))[0];
  const totalInv = datos.reduce((s, m) => s + m.inversion_sector_cop, 0);
  const top = [...datos].sort((a, b) => b.inversion_sector_cop - a.inversion_sector_cop)[0];
  const z = totalInv > 0 ? Math.round((top.inversion_sector_cop / totalInv) * 100) : 0;

  let l1 = `De los ${conIndicador.length} municipios del Pacífico con ${unidad.plur}, ${sinInv.length} no registran ninguna inversión en este sector.`;
  if (extremo) l1 += ` El caso más extremo: ${extremo.nombre} con ${formatNum(extremo.indicador_resultado ?? 0)} ${unidad.plur} y $0.`;
  const l2 = ` Mientras tanto, ${top.nombre} concentra ${formatCOPCompact(top.inversion_sector_cop)} (${z}% de la inversión sectorial del Pacífico).`;
  return l1 + l2;
}
