"use client";

import { useCallback, useRef, useState } from "react";
import type {
  ChatMessage,
  Citation,
  ToolCall,
  ToolName,
} from "@/types/agent";

type Rol = "funcionario" | "ciudadano";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function nowISO() {
  return new Date().toISOString();
}

export function useChatAgent(rol: Rol = "funcionario") {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async (userText: string) => {
      const text = userText.trim();
      if (!text || streaming) return;

      setError(null);

      const userMsg: ChatMessage = {
        id: uid(),
        role: "user",
        content: text,
        timestamp: nowISO(),
      };

      // Mensaje del asistente que iremos rellenando en vivo.
      const assistantId = uid();
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        tool_calls: [],
        citations: [],
        timestamp: nowISO(),
      };

      // Historial para el API en formato Anthropic (solo role + content string).
      const history = [...messages, userMsg].map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      }));

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setStreaming(true);

      // Helper para actualizar el mensaje del asistente en curso.
      const patchAssistant = (fn: (m: ChatMessage) => ChatMessage) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? fn(m) : m))
        );
      };

      const upsertToolCall = (tc: Partial<ToolCall> & { id: string }) => {
        patchAssistant((m) => {
          const existing = m.tool_calls ?? [];
          const idx = existing.findIndex((t) => t.id === tc.id);
          let next: ToolCall[];
          if (idx === -1) {
            next = [
              ...existing,
              {
                id: tc.id,
                name: (tc.name ?? "consultar_secop") as ToolName,
                input: tc.input ?? {},
                status: tc.status ?? "running",
                result: tc.result,
                error: tc.error,
                started_at: tc.started_at,
                finished_at: tc.finished_at,
              },
            ];
          } else {
            next = existing.map((t) =>
              t.id === tc.id ? { ...t, ...tc } : t
            );
          }
          return { ...m, tool_calls: next };
        });
      };

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/agent/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history, rol }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          throw new Error(`El servidor respondió ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        // ── Parser SSE manual ────────────────────────────────────────
        // Cada evento: "event: <name>\ndata: <json>\n\n"
        // Un chunk puede traer varios eventos o eventos partidos.
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          let sepIdx: number;
          while ((sepIdx = buffer.indexOf("\n\n")) !== -1) {
            const raw = buffer.slice(0, sepIdx);
            buffer = buffer.slice(sepIdx + 2);

            let eventName = "message";
            let dataLine = "";
            for (const line of raw.split("\n")) {
              if (line.startsWith("event:")) eventName = line.slice(6).trim();
              else if (line.startsWith("data:")) dataLine += line.slice(5).trim();
            }
            if (!dataLine) continue;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let payload: any;
            try {
              payload = JSON.parse(dataLine);
            } catch {
              continue;
            }

            handleEvent(eventName, payload, {
              patchAssistant,
              upsertToolCall,
            });
          }
        }
      } catch (err) {
        if ((err as Error)?.name === "AbortError") {
          // cancelado por el usuario, silencioso
        } else {
          const message = err instanceof Error ? err.message : String(err);
          setError(message);
          patchAssistant((m) => ({
            ...m,
            content:
              m.content ||
              `⚠️ Ocurrió un error al consultar el agente: ${message}`,
          }));
        }
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [messages, streaming, rol]
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
    setStreaming(false);
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { messages, send, reset, stop, streaming, error };
}

// ─── Manejo de cada evento SSE ───────────────────────────────────────────
interface Handlers {
  patchAssistant: (fn: (m: ChatMessage) => ChatMessage) => void;
  upsertToolCall: (tc: Partial<ToolCall> & { id: string }) => void;
}

function handleEvent(
  name: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any,
  { patchAssistant, upsertToolCall }: Handlers
) {
  switch (name) {
    case "assistant_text":
      patchAssistant((m) => ({ ...m, content: m.content + (payload.text ?? "") }));
      break;

    case "tool_call_start":
      upsertToolCall({
        id: payload.id,
        name: payload.name,
        input: payload.input ?? {},
        status: "running",
        started_at: nowISO(),
      });
      break;

    case "tool_call_result":
      upsertToolCall({
        id: payload.id,
        name: payload.name,
        status: "done",
        result: payload.result,
        finished_at: nowISO(),
      });
      break;

    case "tool_call_error":
      upsertToolCall({
        id: payload.id,
        name: payload.name,
        status: "error",
        error: payload.error,
        finished_at: nowISO(),
      });
      break;

    case "citations":
      patchAssistant((m) => ({
        ...m,
        citations: (payload.citations ?? []) as Citation[],
      }));
      break;

    case "error":
      patchAssistant((m) => ({
        ...m,
        content:
          m.content + `\n\n⚠️ ${payload.message ?? "Error del agente."}`,
      }));
      break;

    case "done":
    case "assistant_chunk_start":
    default:
      break;
  }
}
