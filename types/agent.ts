// ─────────────────────────────────────────────────────────────────────────
// BRÚJULA · Tipos del agente conversacional
// ─────────────────────────────────────────────────────────────────────────

export type ToolName =
  | "consultar_indicadores_municipio"
  | "consultar_secop"
  | "consultar_educacion"
  | "consultar_pobreza_sisben"
  | "consultar_violencia"
  | "detectar_zonas_olvidadas"
  | "buscar_dataset_datosgovco";

export type ToolStatus = "pending" | "running" | "done" | "error";

export interface ToolCall {
  id: string;
  name: ToolName;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input: Record<string, any>;
  status: ToolStatus;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result?: any;
  error?: string;
  started_at?: string;
  finished_at?: string;
}

export interface Citation {
  label: string; // "SECOP II"
  dataset_id: string; // "jbjy-vk9h"
  url: string; // link al dataset en datos.gov.co
  detail?: string; // "27.809 contratos · 2017–2025"
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  tool_calls?: ToolCall[];
  citations?: Citation[];
  timestamp: string;
}

export interface AgentSession {
  id: string;
  messages: ChatMessage[];
  rol: "funcionario" | "ciudadano";
  municipio_focus?: string | null;
  created_at: string;
}

// ─── Eventos SSE que emite /api/agent/chat ───────────────────────────────
export type AgentEventName =
  | "assistant_chunk_start"
  | "assistant_text"
  | "tool_call_start"
  | "tool_call_result"
  | "tool_call_error"
  | "citations"
  | "done"
  | "error";
