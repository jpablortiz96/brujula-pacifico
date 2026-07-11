"use client";

import { useEffect, useState } from "react";
import { ChevronRight, Wallet, Download, Search } from "lucide-react";
import SelectorMunicipio from "@/components/brujula/SelectorMunicipio";
import FiltroPeriodo, { type Periodo } from "@/components/brujula/FiltroPeriodo";
import ContratosSector from "@/components/brujula/ContratosSector";
import { useRol } from "@/lib/context/RolContext";
import { colorSector } from "@/lib/clasificacion/colores";
import { formatearMonedaLegible } from "@/lib/formato";
import { formatNum } from "@/lib/zonas-ui";
import { toCSV } from "@/lib/export/open-data";
import type { MunicipioLista } from "@/lib/queries/comparador";
import type { GastoSector } from "@/lib/queries/sectores";

export default function MiPlataClient() {
  const { rol } = useRol();
  const money = (v: number | null | undefined) => formatearMonedaLegible(v, rol);

  const [municipios, setMunicipios] = useState<MunicipioLista[]>([]);
  const [loadingMunis, setLoadingMunis] = useState(true);
  const [divipola, setDivipola] = useState<string | null>("52835"); // Tumaco
  const [periodo, setPeriodo] = useState<Periodo>({ fechaInicio: null, fechaFin: null });
  const [sectores, setSectores] = useState<GastoSector[]>([]);
  const [rango, setRango] = useState<{ min: string | null; max: string | null }>({ min: null, max: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drill, setDrill] = useState<string | null>(null); // sector abierto

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await fetch("/api/comparador");
        const json = await res.json();
        if (!cancel) setMunicipios(json.municipios ?? []);
      } catch {
        /* silencioso */
      } finally {
        if (!cancel) setLoadingMunis(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    if (!divipola) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ divipola });
        if (periodo.fechaInicio) params.set("fechaInicio", periodo.fechaInicio);
        if (periodo.fechaFin) params.set("fechaFin", periodo.fechaFin);
        const res = await fetch(`/api/sectores?${params.toString()}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.detalle || json.error || `HTTP ${res.status}`);
        if (!cancel) {
          setSectores(json.sectores ?? []);
          if (json.rango) setRango(json.rango);
        }
      } catch (err) {
        if (!cancel) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [divipola, periodo]);

  const nombre = municipios.find((m) => m.divipola === divipola)?.nombre ?? "";
  const totalValor = sectores.reduce((s, x) => s + x.valor_cop, 0);
  const totalContratos = sectores.reduce((s, x) => s + x.contratos, 0);
  const top = sectores[0];
  const periodoFrase =
    periodo.fechaInicio || periodo.fechaFin
      ? `, entre ${periodo.fechaInicio?.slice(0, 7) ?? "inicio"} y ${periodo.fechaFin?.slice(0, 7) ?? "2025"},`
      : "";

  function exportar() {
    const rows = sectores.map((s) => ({
      municipio: nombre,
      sector: s.sector,
      contratos: s.contratos,
      valor_cop: Math.round(s.valor_cop),
      pct_valor: s.pct_valor,
    }));
    const url = URL.createObjectURL(new Blob([toCSV(rows)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `brujula-gasto-${nombre.toLowerCase().replace(/\s+/g, "-")}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-3xl mx-auto w-full space-y-5">
      <div>
        <nav className="flex items-center gap-1 gov-label text-gov-muted mb-2" style={{ fontSize: 10 }}>
          <span>BRÚJULA</span>
          <ChevronRight size={11} />
          <span className="text-gov-azul">¿En qué se gastó mi plata?</span>
        </nav>
        <h1 className="flex items-center gap-2 text-gov-azul" style={{ fontSize: 26, fontWeight: 600, lineHeight: 1.1 }}>
          <Wallet size={24} /> ¿En qué se gastó la plata de mi municipio?
        </h1>
        <p className="text-gov-muted mt-1" style={{ fontSize: 14, maxWidth: 600 }}>
          Cada peso contratado, clasificado por sector, con datos abiertos de datos.gov.co.
        </p>
      </div>

      <SelectorMunicipio municipios={municipios} value={divipola} onChange={setDivipola} label="Municipio" loading={loadingMunis} />
      <FiltroPeriodo fechaInicio={periodo.fechaInicio} fechaFin={periodo.fechaFin} onChange={setPeriodo} rango={rango} />

      {error && (
        <div className="p-4 gov-mono" style={{ border: "2px solid rgb(206 17 38)", borderRadius: 4, color: "rgb(206 17 38)", fontSize: 13 }}>
          ⚠️ {error}
        </div>
      )}

      {!divipola ? (
        <EmptyState texto="Selecciona un municipio para ver el desglose." />
      ) : loading || loadingMunis ? (
        <div className="p-8 text-center animate-pulse text-gov-muted" style={{ fontSize: 13 }}>Cargando desglose…</div>
      ) : sectores.length === 0 || totalValor === 0 ? (
        <EmptyState
          texto={
            `${nombre || "Este municipio"} no registra contratos en el período seleccionado.` +
            (rango.min && rango.max
              ? ` Los datos disponibles de este municipio van de ${rango.min} a ${rango.max}.`
              : "")
          }
        />
      ) : (
        <>
          {/* Card destacada */}
          <div className="p-4" style={{ border: "2px solid rgb(10 37 64)", borderLeft: "6px solid rgb(255 205 0)", borderRadius: 4, background: "#fff" }}>
            <p className="text-gov-azul" style={{ fontSize: 15, lineHeight: 1.55 }}>
              En <strong>{nombre}</strong>{periodoFrase} se contrataron{" "}
              <strong>{money(totalValor)}</strong> en <strong>{formatNum(totalContratos)}</strong> contratos.
              El sector con más inversión fue <strong>{top?.sector}</strong> con el <strong>{top?.pct_valor}%</strong> del total.
            </p>
          </div>

          {/* Barras clickeables */}
          <div className="bg-white p-4 space-y-2.5" style={{ border: "0.5px solid rgb(10 37 64)", borderRadius: 4 }}>
            {sectores.map((s) => (
              <button
                key={s.sector}
                type="button"
                onClick={() => setDrill(s.sector)}
                className="w-full text-left transition-colors"
                style={{ cursor: "pointer", padding: "4px", margin: "-4px", borderRadius: 4 }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgb(249 250 251)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "")}
              >
                <div className="flex items-center justify-between mb-1" style={{ fontSize: 12.5 }}>
                  <span className="text-gov-azul flex items-center gap-1" style={{ fontWeight: 500 }}>
                    {s.sector}
                    <Search size={11} className="text-gov-muted" />
                  </span>
                  <span className="text-gov-muted tabular-nums">
                    {money(s.valor_cop)} · {formatNum(s.contratos)} contr. · {s.pct_valor}%
                  </span>
                </div>
                <div style={{ height: 12, background: "rgb(244 242 236)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ width: `${Math.max(s.pct_valor, 0.5)}%`, height: "100%", background: colorSector(s.sector), transition: "width 0.3s ease" }} />
                </div>
              </button>
            ))}
            <p className="text-gov-muted pt-1" style={{ fontSize: 10.5 }}>
              Haz clic en un sector para ver los contratos individuales con enlace a SECOP.
            </p>
          </div>

          <button
            type="button"
            onClick={exportar}
            className="flex items-center gap-2"
            style={{ border: "2px solid rgb(10 37 64)", background: "#fff", color: "rgb(10 37 64)", borderRadius: 4, padding: "8px 14px", fontSize: 13, fontWeight: 600 }}
          >
            <Download size={15} /> Exportar desglose (CSV)
          </button>
        </>
      )}

      {/* Nota metodológica */}
      <div className="p-3" style={{ borderLeft: "4px solid rgb(255 205 0)", background: "rgb(249 250 251)", borderRadius: 4 }}>
        <p className="text-gov-muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
          El sector se infiere automáticamente del objeto del contrato mediante análisis de texto.
          La clasificación es aproximada y verificable contrato por contrato en SECOP. Los contratos
          de &ldquo;Administración y servicios generales&rdquo; incluyen gastos de funcionamiento.
        </p>
      </div>

      {/* Drill-down */}
      {divipola && (
        <ContratosSector
          divipola={divipola}
          sector={drill}
          nombreMunicipio={nombre}
          fechaInicio={periodo.fechaInicio}
          fechaFin={periodo.fechaFin}
          rol={rol}
          onClose={() => setDrill(null)}
        />
      )}
    </div>
  );
}

function EmptyState({ texto }: { texto: string }) {
  return (
    <div className="p-8 text-center" style={{ border: "2px solid rgb(10 37 64)", borderRadius: 4, background: "#fff" }}>
      <Wallet size={30} className="text-gov-muted mx-auto mb-3" />
      <p className="text-gov-muted" style={{ fontSize: 14, maxWidth: 420, margin: "0 auto" }}>{texto}</p>
    </div>
  );
}
