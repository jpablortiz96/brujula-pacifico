"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, RotateCcw, Compass, Loader2 } from "lucide-react";
import { useChatAgent } from "@/lib/hooks/useChatAgent";
import { useRol } from "@/lib/context/RolContext";
import ChatMessage from "./ChatMessage";

const SUGERENCIAS = [
  "¿Cómo está Tumaco comparado con Cali?",
  "Muéstrame las zonas más olvidadas del Pacífico",
  "Busca datos sobre vacunación infantil en datos.gov.co",
];

export default function ChatPanel({ initialQuery }: { initialQuery?: string }) {
  const { rol } = useRol();
  const { messages, send, reset, streaming, error } = useChatAgent(rol);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSent = useRef(false);

  // Auto-scroll al fondo cuando cambian los mensajes.
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  // Precarga ?q= desde la ficha del municipio: auto-envía una sola vez.
  useEffect(() => {
    const q = initialQuery?.trim();
    if (q && !autoSent.current) {
      autoSent.current = true;
      send(q);
    }
  }, [initialQuery, send]);

  function handleSend() {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    send(text);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const isEmpty = messages.length === 0;
  // ¿El último mensaje del asistente aún no tiene texto ni tools? → "Pensando…"
  const last = messages[messages.length - 1];
  const waitingFirstChunk =
    streaming &&
    last?.role === "assistant" &&
    last.content.trim() === "" &&
    (last.tool_calls?.length ?? 0) === 0;

  return (
    <div className="flex flex-col h-full min-h-0 bg-gov-bone">
      {/* Header del chat */}
      <div
        className="flex items-center gap-3 px-5 py-3 flex-shrink-0"
        style={{ background: "rgb(10 37 64)" }}
      >
        <Sparkles size={18} className="text-gov-amarillo flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-white font-medium" style={{ fontSize: 15 }}>
            BRÚJULA · Copiloto Territorial
          </div>
          <div
            className="gov-mono"
            style={{ fontSize: 10, color: "rgb(180 195 210)" }}
          >
            Copiloto IA · 9 herramientas · datos.gov.co en vivo
          </div>
        </div>
        <span
          className="gov-pill flex-shrink-0"
          style={{
            background: "rgb(255 205 0)",
            color: "rgb(10 37 64)",
          }}
        >
          {rol}
        </span>
        {!isEmpty && (
          <button
            type="button"
            onClick={reset}
            title="Nueva conversación"
            className="flex items-center gap-1 px-2 py-1 rounded-sm transition-colors flex-shrink-0"
            style={{ color: "rgb(180 195 210)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "rgb(180 195 210)")
            }
          >
            <RotateCcw size={13} />
            <span style={{ fontSize: 11 }}>Reiniciar</span>
          </button>
        )}
      </div>

      {/* Cuerpo scrolleable */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto px-4 py-5 space-y-4"
      >
        {isEmpty ? (
          <EmptyState onPick={(q) => send(q)} disabled={streaming} />
        ) : (
          <div className="max-w-3xl mx-auto w-full space-y-4">
            {messages.map((m) => (
              <ChatMessage key={m.id} message={m} />
            ))}
            {waitingFirstChunk && <ThinkingIndicator />}
          </div>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div
          className="px-4 py-2 gov-mono flex-shrink-0"
          style={{
            background: "rgb(206 17 38)",
            color: "#fff",
            fontSize: 12,
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Footer: input */}
      <div
        className="flex-shrink-0 px-4 py-3"
        style={{
          background: "#fff",
          borderTop: "2px solid rgb(10 37 64)",
        }}
      >
        <div className="max-w-3xl mx-auto w-full flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pregunta por un municipio, un contrato, una brecha… (Enter para enviar)"
            rows={2}
            disabled={streaming}
            className="flex-1 resize-none px-3 py-2 outline-none gov-card"
            style={{ fontSize: 14, minHeight: 46, maxHeight: 140 }}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={streaming || input.trim() === ""}
            className="flex items-center justify-center gap-2 px-4 font-medium transition-opacity"
            style={{
              background: "rgb(10 37 64)",
              color: "#fff",
              borderRadius: 4,
              height: 46,
              opacity: streaming || input.trim() === "" ? 0.5 : 1,
              cursor:
                streaming || input.trim() === "" ? "not-allowed" : "pointer",
            }}
          >
            {streaming ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
            <span style={{ fontSize: 13 }} className="hidden sm:inline">
              {streaming ? "Analizando" : "Enviar"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Estado vacío con sugerencias ────────────────────────────────────────
function EmptyState({
  onPick,
  disabled,
}: {
  onPick: (q: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="max-w-2xl mx-auto w-full pt-6 text-center">
      <div
        className="inline-flex items-center justify-center mb-4"
        style={{
          width: 56,
          height: 56,
          background: "rgb(10 37 64)",
          borderRadius: 4,
        }}
      >
        <Compass size={28} className="text-gov-amarillo" />
      </div>
      <h2
        className="text-gov-azul font-semibold mb-1"
        style={{ fontSize: 20 }}
      >
        Copiloto Territorial del Pacífico
      </h2>
      <p className="text-gov-muted mb-6" style={{ fontSize: 14 }}>
        Pregunta en lenguaje natural. Consulto datos reales de SECOP, MEN,
        Sisbén, Medicina Legal y el catálogo vivo de datos.gov.co.
      </p>

      <div className="space-y-2 text-left">
        <p className="gov-label text-gov-muted mb-2" style={{ fontSize: 10 }}>
          Prueba con
        </p>
        {SUGERENCIAS.map((q) => (
          <button
            key={q}
            type="button"
            disabled={disabled}
            onClick={() => onPick(q)}
            className="w-full text-left px-4 py-3 gov-card transition-colors group flex items-center gap-3"
            style={{ cursor: disabled ? "not-allowed" : "pointer" }}
            onMouseEnter={(e) =>
              !disabled &&
              (e.currentTarget.style.background = "rgb(244 242 236)")
            }
            onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
          >
            <Sparkles
              size={15}
              className="text-gov-amarillo flex-shrink-0"
            />
            <span className="text-gov-azul" style={{ fontSize: 14 }}>
              {q}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Indicador "Pensando…" ───────────────────────────────────────────────
function ThinkingIndicator() {
  return (
    <div className="flex justify-start">
      <div
        className="gov-card flex items-center gap-2"
        style={{ padding: "10px 14px" }}
      >
        <span className="text-gov-muted" style={{ fontSize: 13 }}>
          BRÚJULA está analizando
        </span>
        <span className="flex gap-1">
          <Dot delay={0} />
          <Dot delay={150} />
          <Dot delay={300} />
        </span>
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="rounded-full bg-gov-azul inline-block"
      style={{
        width: 6,
        height: 6,
        animation: "brujulaPulse 1s ease-in-out infinite",
        animationDelay: `${delay}ms`,
      }}
    />
  );
}
