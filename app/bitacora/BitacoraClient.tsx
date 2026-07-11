"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronRight, Download, BookOpen } from "lucide-react";
import MetricCard from "@/components/brujula/MetricCard";
import { toCSV } from "@/lib/export/open-data";
import type { EntradaBitacora, EstadisticasBitacora } from "@/lib/queries/bitacora";

const PAGE = 20;

const ROL_COLOR: Record<string, string> = {
  funcionario: "rgb(10 37 64)",
  ciudadano: "rgb(26 135 84)",
  ciudadano_whatsapp: "#128C7E",
};
const ROL_LABEL: Record<string, string> = {
  funcionario: "Funcionario",
  ciudadano: "Ciudadano",
  ciudadano_whatsapp: "Ciudadano · WhatsApp",
};

function fecha(iso: string): string {
  try {
    return format(new Date(iso), "d 'de' MMM yyyy, HH:mm", { locale: es });
  } catch {
    return iso;
  }
}

interface Resp {
  entradas: EntradaBitacora[];
  total: number;
  estadisticas: EstadisticasBitacora;
  error?: string;
  detalle?: string;
}

export default function BitacoraClient() {
  const [entradas, setEntradas] = useState<EntradaBitacora[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<EstadisticasBitacora | null>(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await fetch(`/api/bitacora?limit=${PAGE}&offset=0`);
        const json: Resp = await res.json();
        if (!res.ok) throw new Error(json.detalle || json.error || `HTTP ${res.status}`);
        if (cancel) return;
        setEntradas(json.entradas);
        setTotal(json.total);
        setStats(json.estadisticas);
      } catch (err) {
        if (!cancel) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancel) setCargando(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  async function cargarMas() {
    setCargandoMas(true);
    try {
      const res = await fetch(`/api/bitacora?limit=${PAGE}&offset=${entradas.length}`);
      const json: Resp = await res.json();
      setEntradas((prev) => [...prev, ...json.entradas]);
    } catch {
      /* ignora */
    } finally {
      setCargandoMas(false);
    }
  }

  async function exportar() {
    const res = await fetch(`/api/bitacora?limit=200&offset=0`);
    const json: Resp = await res.json();
    const rows = (json.entradas ?? []).map((e) => ({
      fecha: e.created_at,
      rol: e.actor_rol ?? "",
      municipio: e.municipio_nombre ?? e.municipio_divipola ?? "",
      consulta: e.consulta ?? "",
      herramientas: (e.datasets_usados ?? []).join("; "),
      respuesta: (e.decision ?? "").replace(/\n/g, " "),
    }));
    const csv = toCSV(rows);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "brujula-bitacora.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const toolTop = stats?.tools_mas_usadas[0];

  return (
    <div className="max-w-4xl mx-auto w-full space-y-5">
      {/* Título */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <nav className="flex items-center gap-1 gov-label text-gov-muted mb-2" style={{ fontSize: 10 }}>
            <span>BRÚJULA</span>
            <ChevronRight size={11} />
            <span className="text-gov-azul">Bitácora de decisiones</span>
          </nav>
          <h1 className="flex items-center gap-2 text-gov-azul" style={{ fontSize: 28, fontWeight: 600, lineHeight: 1.1 }}>
            <BookOpen size={24} /> Bitácora de decisiones
          </h1>
          <p className="text-gov-muted mt-1" style={{ fontSize: 14, maxWidth: 640 }}>
            Memoria institucional auditable. Cada consulta al copiloto queda
            registrada con su contexto, las fuentes usadas y la respuesta
            generada. Sobrevive cambios de administración.
          </p>
        </div>
        {entradas.length > 0 && (
          <button
            type="button"
            onClick={exportar}
            className="flex items-center gap-2 flex-shrink-0"
            style={{ border: "2px solid rgb(10 37 64)", background: "#fff", color: "rgb(10 37 64)", borderRadius: 4, padding: "8px 14px", fontSize: 13, fontWeight: 600 }}
          >
            <Download size={15} /> Exportar bitácora (CSV)
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 gov-mono" style={{ border: "2px solid rgb(206 17 38)", borderRadius: 4, color: "rgb(206 17 38)", fontSize: 13 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MetricCard label="Total de consultas" value={cargando ? "—" : total} variant="azul" loading={cargando} />
        <MetricCard label="Municipios consultados" value={cargando ? "—" : stats?.municipios_consultados ?? 0} variant="verde" loading={cargando} />
        <MetricCard
          label="Herramienta más usada"
          value={cargando ? "—" : toolTop ? nombreTool(toolTop.tool) : "—"}
          sublabel={toolTop ? `${toolTop.veces} usos` : undefined}
          variant="amarillo"
          loading={cargando}
        />
      </div>

      {/* Timeline */}
      {cargando ? (
        <div className="p-8 text-center animate-pulse text-gov-muted" style={{ fontSize: 13 }}>
          Cargando bitácora…
        </div>
      ) : entradas.length === 0 ? (
        <div className="p-8 text-center" style={{ border: "2px solid rgb(10 37 64)", borderRadius: 4, background: "#fff" }}>
          <BookOpen size={30} className="text-gov-muted mx-auto mb-3" />
          <p className="text-gov-muted" style={{ fontSize: 14, maxWidth: 420, margin: "0 auto" }}>
            Aún no hay consultas registradas. Usa el copiloto IA o WhatsApp y
            cada interacción quedará aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {entradas.map((e) => (
            <Entrada key={e.id} e={e} />
          ))}

          {entradas.length < total && (
            <button
              type="button"
              onClick={cargarMas}
              disabled={cargandoMas}
              className="w-full transition-colors"
              style={{ border: "2px solid rgb(10 37 64)", background: "#fff", color: "rgb(10 37 64)", borderRadius: 4, padding: "10px", fontSize: 13, fontWeight: 600 }}
            >
              {cargandoMas ? "Cargando…" : `Cargar más (${total - entradas.length} restantes)`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Entrada({ e }: { e: EntradaBitacora }) {
  const rol = e.actor_rol ?? "desconocido";
  const color = ROL_COLOR[rol] ?? "rgb(92 107 122)";
  const decision = e.decision ?? "";
  const larga = decision.length > 300;

  return (
    <div className="bg-white p-4" style={{ border: "0.5px solid rgb(10 37 64)", borderLeft: "4px solid rgb(255 205 0)", borderRadius: 4 }}>
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <span className="gov-mono text-gov-muted" style={{ fontSize: 11 }}>
          {fecha(e.created_at)}
        </span>
        <span className="gov-pill" style={{ background: color, color: "#fff" }}>
          {ROL_LABEL[rol] ?? rol}
        </span>
        {(e.municipio_nombre || e.municipio_divipola) && (
          <span className="gov-pill" style={{ background: "rgb(244 242 236)", color: "rgb(10 37 64)" }}>
            {e.municipio_nombre ?? e.municipio_divipola}
          </span>
        )}
      </div>

      {e.consulta && (
        <p className="text-gov-azul" style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4 }}>
          “{e.consulta}”
        </p>
      )}

      {e.datasets_usados && e.datasets_usados.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {e.datasets_usados.map((t, i) => (
            <span key={i} className="gov-mono" style={{ fontSize: 10, border: "0.5px solid rgb(10 37 64 / 0.4)", borderRadius: 3, padding: "1px 6px", color: "rgb(92 107 122)" }}>
              {nombreTool(t)}
            </span>
          ))}
        </div>
      )}

      {decision && (
        <div className="mt-2" style={{ fontSize: 13, lineHeight: 1.5, color: "rgb(10 37 64)" }}>
          {larga ? (
            <details className="group">
              <summary className="cursor-pointer select-none" style={{ listStyle: "none" }}>
                <span className="text-gov-muted">{decision.slice(0, 300)}… </span>
                <span className="text-gov-azul group-open:hidden" style={{ fontWeight: 600 }}>Ver respuesta completa</span>
              </summary>
              <p className="mt-1 text-gov-muted whitespace-pre-wrap">{decision}</p>
            </details>
          ) : (
            <p className="text-gov-muted whitespace-pre-wrap">{decision}</p>
          )}
        </div>
      )}
    </div>
  );
}

// "consultar_secop" → "Secop" legible
function nombreTool(t: string): string {
  const limpio = t.replace(/^consultar_/, "").replace(/^detectar_/, "").replace(/_/g, " ");
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}
