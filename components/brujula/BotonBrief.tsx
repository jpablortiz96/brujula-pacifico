"use client";

import { useState } from "react";
import { FileText, Loader2, Download } from "lucide-react";

interface Props {
  divipola: string;
  tipo: "municipio" | "zona_olvidada";
  nombre: string;
  labelText?: string;
}

export default function BotonBrief({ divipola, tipo, nombre, labelText }: Props) {
  const [estado, setEstado] = useState<"idle" | "generando" | "error">("idle");

  async function generar() {
    if (estado === "generando") return;
    setEstado("generando");
    try {
      const res = await fetch(
        `/api/brief?divipola=${encodeURIComponent(divipola)}&tipo=${tipo}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();

      const slug = nombre
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/\s+/g, "-")
        .toLowerCase();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `brujula-brief-${slug}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setEstado("idle");
    } catch {
      setEstado("error");
    }
  }

  const generando = estado === "generando";

  return (
    <div>
      <button
        type="button"
        onClick={generar}
        disabled={generando}
        className="w-full flex items-center justify-center gap-2 transition-opacity"
        style={{
          background: "#fff",
          color: "rgb(10 37 64)",
          border: "2px solid rgb(10 37 64)",
          borderRadius: 4,
          padding: "10px 14px",
          fontSize: 13,
          fontWeight: 600,
          cursor: generando ? "wait" : "pointer",
          opacity: generando ? 0.7 : 1,
        }}
      >
        {generando ? (
          <>
            <Loader2 size={15} className="animate-spin" />
            Generando…
          </>
        ) : (
          <>
            <FileText size={15} />
            {labelText ?? "Generar brief ejecutivo"}
            <Download size={14} className="text-gov-muted" />
          </>
        )}
      </button>

      {estado === "error" ? (
        <p
          className="mt-1.5 text-center gov-mono"
          style={{ fontSize: 11, color: "rgb(206 17 38)" }}
        >
          ⚠️ No se pudo generar. Reintenta.
        </p>
      ) : (
        <p
          className="mt-1.5 text-center text-gov-muted"
          style={{ fontSize: 10.5 }}
        >
          PDF · 4 fuentes citadas · ~10s
        </p>
      )}
    </div>
  );
}
