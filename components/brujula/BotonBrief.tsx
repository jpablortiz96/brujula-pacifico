"use client";

import { useState } from "react";
import { FileText, Loader2, Download } from "lucide-react";

interface Props {
  divipola: string;
  tipo: "municipio" | "zona_olvidada";
  nombre: string;
  labelText?: string;
}

interface BriefErrorBody {
  error?: string;
  code?: string;
  requestId?: string;
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
}

async function readError(res: Response): Promise<BriefErrorBody> {
  try {
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return (await res.json()) as BriefErrorBody;
    }
    const text = await res.text();
    return { error: text || `HTTP ${res.status}` };
  } catch {
    return { error: `HTTP ${res.status}` };
  }
}

export default function BotonBrief({ divipola, tipo, nombre, labelText }: Props) {
  const [generando, setGenerando] = useState(false);
  const [mensaje, setMensaje] = useState("PDF - 4 fuentes citadas - puede tardar hasta 30 segundos");
  const [error, setError] = useState(false);

  async function generar() {
    if (generando) return;
    setGenerando(true);
    setError(false);
    setMensaje("Generando PDF, puede tardar hasta 30 segundos");

    try {
      const res = await fetch(
        `/api/brief?divipola=${encodeURIComponent(divipola)}&tipo=${tipo}`
      );

      if (!res.ok) {
        const body = await readError(res);
        console.error("[BotonBrief] PDF request failed", {
          status: res.status,
          code: body.code,
          requestId: body.requestId,
          error: body.error,
        });
        const suffix = body.requestId ? ` Request ID: ${body.requestId}` : "";
        throw new Error(
          `${body.error || "No se pudo generar el PDF"}${body.code ? ` (${body.code})` : ""}.${suffix}`
        );
      }

      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("application/pdf")) {
        console.error("[BotonBrief] Unexpected content type", { contentType });
        throw new Error(`Respuesta inesperada del servidor: ${contentType || "sin Content-Type"}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `brujula-brief-${slugify(nombre)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1500);

      setMensaje("PDF generado correctamente.");
      setError(false);
    } catch (err) {
      setError(true);
      setMensaje(err instanceof Error ? err.message : "No se pudo generar el PDF.");
    } finally {
      setGenerando(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={generar}
        disabled={generando}
        aria-describedby={`brief-status-${divipola}-${tipo}`}
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
            Generando PDF...
          </>
        ) : (
          <>
            <FileText size={15} />
            {labelText ?? "Generar brief ejecutivo"}
            <Download size={14} className="text-gov-muted" />
          </>
        )}
      </button>

      <p
        id={`brief-status-${divipola}-${tipo}`}
        aria-live="polite"
        className={error ? "mt-1.5 text-center gov-mono" : "mt-1.5 text-center text-gov-muted"}
        style={{ fontSize: error ? 11 : 10.5, color: error ? "rgb(206 17 38)" : undefined }}
      >
        {mensaje}
      </p>
    </div>
  );
}
