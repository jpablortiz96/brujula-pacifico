"use client";

import { useEffect, useState } from "react";
import { WifiOff, Trash2, ChevronRight } from "lucide-react";
import {
  todosLosPaquetes,
  eliminarPaquete,
  type PaqueteTerritorial,
} from "@/lib/offline/paquete-territorial";

const COP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});
const NUM = new Intl.NumberFormat("es-CO");
const FECHA = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" });

const n = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

export default function OfflineClient() {
  const [paquetes, setPaquetes] = useState<PaqueteTerritorial[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cancel = false;
    todosLosPaquetes().then((p) => {
      if (!cancel) {
        setPaquetes(p);
        setCargando(false);
      }
    });
    return () => {
      cancel = true;
    };
  }, []);

  async function borrar(divipola: string) {
    await eliminarPaquete(divipola);
    setPaquetes((prev) => prev.filter((p) => p.divipola !== divipola));
  }

  return (
    <div className="max-w-4xl mx-auto w-full space-y-5">
      <div>
        <nav className="flex items-center gap-1 gov-label text-gov-muted mb-2" style={{ fontSize: 10 }}>
          <span>BRÚJULA</span>
          <ChevronRight size={11} />
          <span className="text-gov-azul">Modo offline</span>
        </nav>
        <h1 className="flex items-center gap-2 text-gov-azul" style={{ fontSize: 28, fontWeight: 600, lineHeight: 1.1 }}>
          <WifiOff size={24} /> Paquetes territoriales guardados
        </h1>
        <p className="text-gov-muted mt-1" style={{ fontSize: 14, maxWidth: 640 }}>
          Estos municipios se descargaron para consulta sin conexión. Esta
          vista funciona íntegramente desde el almacenamiento local del
          dispositivo — no requiere internet.
        </p>
      </div>

      {cargando ? (
        <div className="p-8 text-center animate-pulse text-gov-muted" style={{ fontSize: 13 }}>
          Leyendo almacenamiento local…
        </div>
      ) : paquetes.length === 0 ? (
        <div
          className="p-8 text-center"
          style={{ border: "2px solid rgb(10 37 64)", borderRadius: 4, background: "#fff" }}
        >
          <WifiOff size={30} className="text-gov-muted mx-auto mb-3" />
          <p className="text-gov-muted" style={{ fontSize: 14, maxWidth: 420, margin: "0 auto" }}>
            No hay paquetes descargados. Ve al detector de zonas olvidadas,
            abre un municipio y pulsa &ldquo;Descargar para uso offline&rdquo;.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {paquetes.map((p) => {
            const i = p.indicadores;
            return (
              <div
                key={p.divipola}
                className="bg-white p-4"
                style={{ border: "2px solid rgb(10 37 64)", borderRadius: 4 }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-gov-azul" style={{ fontSize: 19, fontWeight: 600 }}>
                      {p.nombre}
                    </h3>
                    <p className="gov-label text-gov-muted" style={{ fontSize: 10 }}>
                      {p.departamento} · DIVIPOLA {p.divipola}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => borrar(p.divipola)}
                    title="Eliminar paquete"
                    className="text-gov-muted hover:text-gov-rojo transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                  <Dato label="Contratos" valor={NUM.format(n(i.contratos))} />
                  <Dato label="Valor contratado" valor={COP.format(n(i.valor_contratos))} />
                  <Dato label="Pobl. vulnerable" valor={p.poblacion_vulnerable != null ? NUM.format(p.poblacion_vulnerable) : "—"} />
                  <Dato label="Homicidios" valor={NUM.format(n(i.homicidios))} />
                </div>

                {p.contratos_top.length > 0 && (
                  <details className="mt-3 group">
                    <summary className="flex items-center gap-1 cursor-pointer select-none text-gov-muted" style={{ fontSize: 12, listStyle: "none" }}>
                      <ChevronRight size={13} className="transition-transform group-open:rotate-90" />
                      Ver {p.contratos_top.length} contratos principales
                    </summary>
                    <ul className="mt-2 space-y-1.5">
                      {p.contratos_top.map((c, idx) => (
                        <li key={idx} className="flex justify-between gap-3" style={{ fontSize: 12 }}>
                          <span className="text-gov-azul truncate" style={{ maxWidth: "70%" }}>
                            {String(c.objeto_contrato ?? "—").slice(0, 90)}
                          </span>
                          <span className="tabular-nums text-gov-muted flex-shrink-0">
                            {COP.format(n(c.valor_contrato))}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}

                <p className="text-gov-muted mt-3" style={{ fontSize: 10.5 }}>
                  Datos guardados el {FECHA.format(new Date(p.generado_en))}.
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div style={{ border: "0.5px solid rgb(10 37 64)", borderRadius: 4, padding: "8px 10px" }}>
      <p className="gov-label text-gov-muted" style={{ fontSize: 9 }}>
        {label}
      </p>
      <p className="tabular-nums text-gov-azul" style={{ fontSize: 15, fontWeight: 600 }}>
        {valor}
      </p>
    </div>
  );
}
