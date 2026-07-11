import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { TOOLS_DEFINITIONS, executeTool, DATASET_CATALOG } from "@/lib/agent/tools";
import { SYSTEM_PROMPT } from "@/lib/agent/system-prompt";
import { BRUJULA_MODEL } from "@/lib/anthropic/client";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Citation, ToolName } from "@/types/agent";

export const runtime = "nodejs";
export const maxDuration = 60;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const MAX_ITERATIONS = 5;

export async function POST(req: NextRequest) {
  const { messages, rol = "funcionario" } = await req.json();
  const startedAt = Date.now();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const send = (event: string, data: any) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      // ── Acumuladores para bitácora + citaciones ──────────────────────
      const toolsUsed: ToolName[] = [];
      const liveCitations: Citation[] = [];
      let municipioFocus: string | null = null;
      let finalAssistantText = "";
      let toolCallsCount = 0;

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const conversationMessages: any[] = [...messages];
        let iteration = 0;
        let stopReason: string | null = null;

        while (iteration < MAX_ITERATIONS) {
          iteration++;

          const response = await anthropic.messages.create({
            model: BRUJULA_MODEL,
            max_tokens: 2048,
            system: SYSTEM_PROMPT + `\n\nRol del usuario: ${rol}`,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            tools: TOOLS_DEFINITIONS as any,
            messages: conversationMessages,
          });

          stopReason = response.stop_reason;
          send("assistant_chunk_start", { iteration });

          const assistantMessage = {
            role: "assistant" as const,
            content: response.content,
          };
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const toolUses: any[] = [];

          for (const block of response.content) {
            if (block.type === "text") {
              finalAssistantText += block.text;
              send("assistant_text", { text: block.text });
            } else if (block.type === "tool_use") {
              toolUses.push(block);
              send("tool_call_start", {
                id: block.id,
                name: block.name,
                input: block.input,
              });
            }
          }

          // Sin tools → el modelo terminó su turno.
          if (toolUses.length === 0) {
            break;
          }

          conversationMessages.push(assistantMessage);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const toolResults: any[] = [];

          for (const tu of toolUses) {
            toolCallsCount++;
            const toolName = tu.name as ToolName;
            if (!toolsUsed.includes(toolName)) toolsUsed.push(toolName);
            // Capturar municipio de foco si la tool lo trae.
            if (tu.input?.divipola && !municipioFocus) {
              municipioFocus = String(tu.input.divipola);
            }

            try {
              const result = await executeTool(tu.name, tu.input);

              // Citación derivada del catálogo pre-cargado.
              const cat = DATASET_CATALOG[toolName];
              if (cat && !liveCitations.some((c) => c.dataset_id === cat.dataset_id && c.label === cat.label)) {
                liveCitations.push(cat);
              }
              // Citaciones vivas desde el catálogo Socrata.
              if (toolName === "buscar_dataset_datosgovco" && result?.datasets_encontrados) {
                for (const d of result.datasets_encontrados) {
                  if (d?.id && !liveCitations.some((c) => c.dataset_id === d.id)) {
                    liveCitations.push({
                      label: d.nombre || "Dataset datos.gov.co",
                      dataset_id: d.id,
                      url: d.url,
                      detail: d.entidad || undefined,
                    });
                  }
                }
              }

              send("tool_call_result", { id: tu.id, name: tu.name, result });
              toolResults.push({
                type: "tool_result",
                tool_use_id: tu.id,
                content: JSON.stringify(result),
              });
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              send("tool_call_error", { id: tu.id, name: tu.name, error: message });
              toolResults.push({
                type: "tool_result",
                tool_use_id: tu.id,
                content: `Error: ${message}`,
                is_error: true,
              });
            }
          }

          conversationMessages.push({ role: "user", content: toolResults });
        }

        if (iteration >= MAX_ITERATIONS && stopReason === "tool_use") {
          stopReason = "max_iterations";
        }

        // Enviar citaciones derivadas antes de cerrar.
        send("citations", { citations: liveCitations });
        send("done", { stop_reason: stopReason });

        // ── Paso 8 · Bitácora automática (nunca rompe el stream) ───────
        await registrarBitacora({
          rol,
          municipioFocus,
          messages,
          toolsUsed,
          finalAssistantText,
          toolCallsCount,
          durationMs: Date.now() - startedAt,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        send("error", { message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

// ─── Persistencia en bitácora ────────────────────────────────────────────
interface BitacoraArgs {
  rol: string;
  municipioFocus: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messages: any[];
  toolsUsed: ToolName[];
  finalAssistantText: string;
  toolCallsCount: number;
  durationMs: number;
}

async function registrarBitacora(args: BitacoraArgs) {
  try {
    const sb = createAdminClient();

    const lastUser = [...args.messages]
      .reverse()
      .find((m) => m.role === "user");
    const consulta =
      typeof lastUser?.content === "string"
        ? lastUser.content
        : "(consulta no textual)";

    await sb.from("bitacora").insert({
      actor_rol: args.rol,
      municipio_divipola: args.municipioFocus,
      consulta,
      datasets_usados: args.toolsUsed,
      decision: args.finalAssistantText.slice(0, 1000) || null,
      confianza: null,
      metadata: {
        messages_count: args.messages.length,
        tool_calls_count: args.toolCallsCount,
        duration_ms: args.durationMs,
      },
    });
  } catch (err) {
    // La bitácora es best-effort: si falla (p.ej. FK de municipio), no
    // debe afectar la respuesta al usuario.
    console.error("[bitacora] no se pudo registrar:", err);
  }
}
