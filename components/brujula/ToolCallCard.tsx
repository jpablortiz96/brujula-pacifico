"use client";

import { useState } from "react";
import {
  Database,
  Search,
  AlertTriangle,
  GraduationCap,
  Users,
  ShieldAlert,
  MapPin,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import type { ToolCall, ToolName, ToolStatus } from "@/types/agent";

const TOOL_META: Record<
  ToolName,
  { label: string; icon: React.ElementType }
> = {
  consultar_indicadores_municipio: {
    label: "Indicadores del municipio",
    icon: MapPin,
  },
  consultar_secop: { label: "Contratos SECOP", icon: Database },
  consultar_educacion: { label: "Establecimientos educativos", icon: GraduationCap },
  consultar_pobreza_sisben: { label: "Sisbén · vulnerabilidad", icon: Users },
  consultar_violencia: { label: "Lesiones · Medicina Legal", icon: ShieldAlert },
  detectar_zonas_olvidadas: { label: "Zonas olvidadas", icon: AlertTriangle },
  buscar_dataset_datosgovco: { label: "Búsqueda en datos.gov.co", icon: Search },
};

const STATUS_COLOR: Record<ToolStatus, string> = {
  pending: "rgb(92 107 122)",
  running: "rgb(255 205 0)",
  done: "rgb(26 135 84)",
  error: "rgb(206 17 38)",
};

function StatusIcon({ status }: { status: ToolStatus }) {
  if (status === "done")
    return <CheckCircle2 size={14} className="text-gov-verde" />;
  if (status === "error")
    return <XCircle size={14} className="text-gov-rojo" />;
  return <Loader2 size={14} className="text-gov-amarillo animate-spin" />;
}

function formatInput(input: Record<string, unknown>): string {
  const entries = Object.entries(input).filter(([, v]) => v != null && v !== "");
  if (entries.length === 0) return "sin parámetros";
  return entries.map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join("  ·  ");
}

function resultPreview(result: unknown): { keys: string[]; json: string } {
  const json = JSON.stringify(result, null, 2);
  let keys: string[] = [];
  if (result && typeof result === "object" && !Array.isArray(result)) {
    keys = Object.keys(result as Record<string, unknown>);
  }
  return { keys, json };
}

export default function ToolCallCard({ tool }: { tool: ToolCall }) {
  const [open, setOpen] = useState(false);
  const meta = TOOL_META[tool.name] ?? {
    label: tool.name,
    icon: Database,
  };
  const Icon = meta.icon;
  const color = STATUS_COLOR[tool.status];
  const { keys, json } = resultPreview(tool.result);

  const statusLabel =
    tool.status === "running"
      ? "Consultando…"
      : tool.status === "done"
        ? "Listo"
        : tool.status === "error"
          ? "Error"
          : "En cola";

  return (
    <div
      className="my-2 gov-card"
      style={{ borderLeft: `4px solid ${color}` }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <Icon size={15} className="flex-shrink-0 text-gov-azul" />
        <span className="text-sm font-medium text-gov-azul flex-1">
          {meta.label}
        </span>
        <StatusIcon status={tool.status} />
        <span
          className="gov-label"
          style={{ fontSize: 9, color }}
        >
          {statusLabel}
        </span>
      </div>

      {/* Input */}
      <div
        className="px-3 pb-2 gov-mono text-gov-muted"
        style={{ fontSize: 11 }}
      >
        ↳ {formatInput(tool.input)}
      </div>

      {/* Error */}
      {tool.status === "error" && tool.error && (
        <div
          className="px-3 pb-2 gov-mono text-gov-rojo"
          style={{ fontSize: 11 }}
        >
          ⚠️ {tool.error}
        </div>
      )}

      {/* Result preview colapsable */}
      {tool.status === "done" && tool.result != null && (
        <div className="px-3 pb-2">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-1 text-gov-muted hover:text-gov-azul transition-colors"
            style={{ fontSize: 11 }}
          >
            {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            {open
              ? "Ocultar resultado"
              : keys.length > 0
                ? `Ver resultado (${keys.slice(0, 3).join(", ")}${keys.length > 3 ? "…" : ""})`
                : "Ver resultado"}
          </button>
          {open && (
            <pre
              className="mt-2 gov-mono overflow-x-auto rounded-sm p-2"
              style={{
                fontSize: 11,
                background: "rgb(10 37 64)",
                color: "rgb(244 242 236)",
                maxHeight: 260,
              }}
            >
              {json}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
