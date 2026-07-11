"use client";

import { useEffect, useState } from "react";
import { Download, Loader2, CheckCircle2 } from "lucide-react";
import { descargarPaquete, leerPaquete } from "@/lib/offline/paquete-territorial";

interface Props {
  divipola: string;
  nombre: string;
}

export default function DescargarPaquete({ divipola, nombre }: Props) {
  const [estado, setEstado] = useState<"idle" | "descargando" | "listo" | "error">("idle");
  const [kb, setKb] = useState<number | null>(null);

  // ¿Ya está descargado?
  useEffect(() => {
    let cancel = false;
    leerPaquete(divipola).then((p) => {
      if (!cancel && p) {
        setEstado("listo");
        setKb(Math.round(new Blob([JSON.stringify(p)]).size / 1024));
      }
    });
    return () => {
      cancel = true;
    };
  }, [divipola]);

  async function descargar() {
    if (estado === "descargando") return;
    setEstado("descargando");
    try {
      const { bytes } = await descargarPaquete(divipola);
      setKb(Math.round(bytes / 1024));
      setEstado("listo");
    } catch {
      setEstado("error");
    }
  }

  const listo = estado === "listo";

  return (
    <div>
      <button
        type="button"
        onClick={descargar}
        disabled={estado === "descargando"}
        className="w-full flex items-center justify-center gap-2 transition-opacity"
        style={{
          background: listo ? "rgb(26 135 84)" : "#fff",
          color: listo ? "#fff" : "rgb(10 37 64)",
          border: `2px solid ${listo ? "rgb(26 135 84)" : "rgb(10 37 64)"}`,
          borderRadius: 4,
          padding: "10px 14px",
          fontSize: 13,
          fontWeight: 600,
          cursor: estado === "descargando" ? "wait" : "pointer",
        }}
      >
        {estado === "descargando" ? (
          <>
            <Loader2 size={15} className="animate-spin" />
            Descargando…
          </>
        ) : listo ? (
          <>
            <CheckCircle2 size={15} />
            Disponible sin conexión
          </>
        ) : (
          <>
            <Download size={15} />
            Descargar para uso offline
          </>
        )}
      </button>
      <p className="mt-1.5 text-center text-gov-muted" style={{ fontSize: 10.5 }}>
        {estado === "error"
          ? "⚠️ No se pudo descargar. Reintenta."
          : listo && kb != null
            ? `${nombre} guardado · ${kb} KB · consultable en /offline`
            : "Paquete territorial · consultable sin internet"}
      </p>
    </div>
  );
}
