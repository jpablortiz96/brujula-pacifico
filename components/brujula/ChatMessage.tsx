"use client";

import type { ChatMessage as ChatMessageType } from "@/types/agent";
import SimpleMarkdown from "./SimpleMarkdown";
import ToolCallCard from "./ToolCallCard";
import CitationPill from "./CitationPill";

export default function ChatMessage({
  message,
}: {
  message: ChatMessageType;
}) {
  // ── Usuario ─────────────────────────────────────────────────────────
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div
          className="text-white"
          style={{
            background: "rgb(10 37 64)",
            borderRadius: 4,
            padding: "10px 14px",
            maxWidth: "70%",
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  // ── Asistente ───────────────────────────────────────────────────────
  const hasText = message.content.trim().length > 0;
  const toolCalls = message.tool_calls ?? [];
  const citations = message.citations ?? [];

  return (
    <div className="flex justify-start">
      <div style={{ maxWidth: "85%", width: "100%" }}>
        {/* Tool calls en vivo */}
        {toolCalls.map((tc) => (
          <ToolCallCard key={tc.id} tool={tc} />
        ))}

        {/* Texto del asistente */}
        {hasText && (
          <div
            className="gov-card"
            style={{ padding: "12px 16px" }}
          >
            <SimpleMarkdown content={message.content} />

            {/* Citaciones */}
            {citations.length > 0 && (
              <div
                className="mt-3 pt-3 flex flex-wrap gap-2"
                style={{ borderTop: "0.5px solid rgb(10 37 64 / 0.15)" }}
              >
                <span
                  className="gov-label text-gov-muted w-full mb-1"
                  style={{ fontSize: 10 }}
                >
                  📊 Fuentes · datos.gov.co
                </span>
                {citations.map((c, i) => (
                  <CitationPill key={`${c.dataset_id}-${i}`} citation={c} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
