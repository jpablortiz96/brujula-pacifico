"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatearMonedaLegible } from "@/lib/formato";
import { toCSV } from "@/lib/export/open-data";

type Rol = "funcionario" | "ciudadano";

interface Contrato {
  id: string;
  fecha_firma: string | null;
  nombre_entidad: string | null;
  objeto_contrato: string | null;
  proveedor_adjudicado: string | null;
  valor_contrato: number | null;
  estado_contrato: string | null;
  url_proceso: string | null;
}

interface Props {
  divipola: string;
  sector: string | null; // null = cerrado
  nombreMunicipio: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  rol: Rol;
  onClose: () => void;
}

const FECHA = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" });
const COP = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const PAGE = 20;

function fecha(iso: string | null) {
  if (!iso) return "—";
  try {
    return FECHA.format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function ContratosSector({
  divipola, sector, nombreMunicipio, fechaInicio, fechaFin, rol, onClose,
}: Props) {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);

  const abierto = sector != null;

  useEffect(() => {
    if (!sector) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      setContratos([]);
      try {
        const data = await fetchPagina(divipola, sector, fechaInicio, fechaFin, 0);
        if (!cancel) {
          setContratos(data.contratos);
          setTotal(data.total);
        }
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [sector, divipola, fechaInicio, fechaFin]);

  async function cargarMas() {
    if (!sector) return;
    setCargandoMas(true);
    try {
      const data = await fetchPagina(divipola, sector, fechaInicio, fechaFin, contratos.length);
      setContratos((prev) => [...prev, ...data.contratos]);
    } finally {
      setCargandoMas(false);
    }
  }

  function exportar() {
    const rows = contratos.map((c) => ({
      fecha: c.fecha_firma ?? "",
      entidad: c.nombre_entidad ?? "",
      objeto: (c.objeto_contrato ?? "").replace(/\n/g, " "),
      proveedor: c.proveedor_adjudicado ?? "",
      valor_cop: Math.round(Number(c.valor_contrato ?? 0)),
      estado: c.estado_contrato ?? "",
      url: c.url_proceso ?? "",
    }));
    const url = URL.createObjectURL(new Blob([toCSV(rows)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `brujula-contratos-${sector?.toLowerCase().replace(/\s+/g, "-")}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const totalValor = contratos.reduce((s, c) => s + Number(c.valor_contrato ?? 0), 0);
  const periodoTxt =
    !fechaInicio && !fechaFin ? "todo el período" : `${fechaInicio ?? "inicio"} a ${fechaFin ?? "hoy"}`;

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-2xl"
        style={{ border: "2px solid rgb(10 37 64)", background: "#fff", maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column" }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: "rgb(10 37 64)" }}>
            {sector} en {nombreMunicipio}
          </DialogTitle>
          <p className="text-gov-muted" style={{ fontSize: 12 }}>
            {total} contratos · {formatearMonedaLegible(totalValor, rol)} (esta página) · {periodoTxt}
          </p>
        </DialogHeader>

        <div className="overflow-y-auto -mx-1 px-1" style={{ flex: 1 }}>
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="animate-pulse" style={{ height: 72, background: "rgb(244 242 236)", borderRadius: 4 }} />
              ))}
            </div>
          ) : contratos.length === 0 ? (
            <p className="text-gov-muted text-center py-8" style={{ fontSize: 13 }}>
              No hay contratos para este sector y período.
            </p>
          ) : (
            <div className="space-y-2">
              {contratos.map((c) => (
                <div key={c.id} className="p-3" style={{ border: "0.5px solid rgb(10 37 64)", borderRadius: 4 }}>
                  <div className="flex items-start justify-between gap-3">
                    <span className="gov-mono text-gov-muted" style={{ fontSize: 11 }}>{fecha(c.fecha_firma)}</span>
                    <span className="tabular-nums text-gov-azul flex-shrink-0" style={{ fontSize: 15, fontWeight: 700 }}>
                      {COP.format(Math.round(Number(c.valor_contrato ?? 0)))}
                    </span>
                  </div>
                  <p className="text-gov-azul mt-1" style={{ fontSize: 13, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {c.objeto_contrato ?? "(sin objeto)"}
                  </p>
                  <div className="flex items-center justify-between gap-2 mt-1.5" style={{ fontSize: 11 }}>
                    <span className="text-gov-muted truncate">
                      {c.nombre_entidad ?? "—"} · {c.proveedor_adjudicado ?? "sin proveedor"}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {c.estado_contrato && (
                        <span className="gov-pill" style={{ background: "rgb(244 242 236)", color: "rgb(10 37 64)", fontSize: 9 }}>
                          {c.estado_contrato}
                        </span>
                      )}
                      {c.url_proceso && (
                        <a href={c.url_proceso} target="_blank" rel="noopener noreferrer" title="Ver en SECOP" className="text-gov-azul">
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {contratos.length < total && (
                <button
                  type="button"
                  onClick={cargarMas}
                  disabled={cargandoMas}
                  className="w-full"
                  style={{ border: "2px solid rgb(10 37 64)", background: "#fff", color: "rgb(10 37 64)", borderRadius: 4, padding: "8px", fontSize: 12.5, fontWeight: 600 }}
                >
                  {cargandoMas ? "Cargando…" : `Cargar más (${total - contratos.length} restantes)`}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={exportar}
            disabled={contratos.length === 0}
            className="flex items-center gap-2"
            style={{ border: "2px solid rgb(10 37 64)", background: "#fff", color: "rgb(10 37 64)", borderRadius: 4, padding: "6px 12px", fontSize: 12.5, fontWeight: 600, opacity: contratos.length === 0 ? 0.5 : 1 }}
          >
            <Download size={14} /> Exportar estos contratos (CSV)
          </button>
          <span className="text-gov-muted" style={{ fontSize: 10.5 }}>
            Cada contrato es verificable en el portal SECOP.
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

async function fetchPagina(
  divipola: string, sector: string, fi: string | null, ff: string | null, offset: number
): Promise<{ contratos: Contrato[]; total: number }> {
  const params = new URLSearchParams({ divipola, sector, limit: String(PAGE), offset: String(offset) });
  if (fi) params.set("fechaInicio", fi);
  if (ff) params.set("fechaFin", ff);
  const res = await fetch(`/api/sectores/contratos?${params.toString()}`);
  if (!res.ok) return { contratos: [], total: 0 };
  const json = await res.json();
  return { contratos: json.contratos ?? [], total: json.total ?? 0 };
}
