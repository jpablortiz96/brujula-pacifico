"use client";

import { useState } from "react";
import { Database, Loader2, Download } from "lucide-react";

interface Props {
  tipo: "zonas" | "comparacion";
  divipolaA?: string | null;
  divipolaB?: string | null;
  label?: string;
}

export default function BotonExportar({
  tipo,
  divipolaA,
  divipolaB,
  label,
}: Props) {
  const [estado, setEstado] = useState<"idle" | "exportando" | "error">("idle");

  const deshabilitado =
    tipo === "comparacion" && (!divipolaA || !divipolaB);

  async function exportar() {
    if (estado === "exportando" || deshabilitado) return;
    setEstado("exportando");
    try {
      const qs =
        tipo === "comparacion"
          ? `?tipo=comparacion&a=${divipolaA}&b=${divipolaB}`
          : `?tipo=zonas`;
      const res = await fetch(`/api/export${qs}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `brujula-${tipo}-datos-abiertos.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setEstado("idle");
    } catch {
      setEstado("error");
    }
  }

  const exportando = estado === "exportando";

  return (
    <div>
      <button
        type="button"
        onClick={exportar}
        disabled={exportando || deshabilitado}
        className="w-full flex items-center justify-center gap-2 transition-opacity"
        style={{
          background: "#fff",
          color: "rgb(10 37 64)",
          border: "2px solid rgb(10 37 64)",
          borderRadius: 4,
          padding: "10px 14px",
          fontSize: 13,
          fontWeight: 600,
          cursor: exportando || deshabilitado ? "not-allowed" : "pointer",
          opacity: exportando || deshabilitado ? 0.6 : 1,
        }}
      >
        {exportando ? (
          <>
            <Loader2 size={15} className="animate-spin" />
            Exportando…
          </>
        ) : (
          <>
            <Database size={15} />
            {label ?? "Exportar como dato abierto"}
            <Download size={14} className="text-gov-muted" />
          </>
        )}
      </button>

      {estado === "error" ? (
        <p className="mt-1.5 text-center gov-mono" style={{ fontSize: 11, color: "rgb(206 17 38)" }}>
          ⚠️ No se pudo exportar. Reintenta.
        </p>
      ) : (
        <p className="mt-1.5 text-center text-gov-muted" style={{ fontSize: 10.5 }}>
          CSV + ficha de metadatos · listo para datos.gov.co/usos
        </p>
      )}
    </div>
  );
}
