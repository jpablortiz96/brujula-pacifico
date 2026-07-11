import Anthropic from "@anthropic-ai/sdk";
import { TOOLS_DEFINITIONS, executeTool } from "@/lib/agent/tools";
import { SYSTEM_PROMPT } from "@/lib/agent/system-prompt";
import { BRUJULA_MODEL } from "@/lib/anthropic/client";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AgentMessage = { role: "user" | "assistant"; content: any };

/**
 * Bucle agentic NO-streaming, reutilizable (WhatsApp, jobs, etc.).
 * Devuelve el texto final completo y las tools que se usaron.
 */
export async function ejecutarAgente(
  messages: AgentMessage[],
  rol: "funcionario" | "ciudadano" = "ciudadano",
  maxIter = 4,
  instruccionCanal = ""
): Promise<{ texto: string; toolsUsadas: string[] }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conversation: any[] = [...messages];
  const toolsUsadas: string[] = [];
  let textoFinal = "";
  let iter = 0;

  const system =
    SYSTEM_PROMPT +
    `\n\nRol del usuario: ${rol}` +
    (instruccionCanal ? `\n\n${instruccionCanal}` : "");

  while (iter < maxIter) {
    iter++;

    const response = await anthropic.messages.create({
      model: BRUJULA_MODEL,
      max_tokens: 1024,
      system,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: TOOLS_DEFINITIONS as any,
      messages: conversation,
    });

    let textoIter = "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toolUses: any[] = [];
    for (const block of response.content) {
      if (block.type === "text") textoIter += block.text;
      else if (block.type === "tool_use") toolUses.push(block);
    }
    // Nos quedamos con el texto de la última iteración con contenido
    // (la respuesta final, no los preámbulos "voy a consultar…").
    if (textoIter.trim()) textoFinal = textoIter;

    if (toolUses.length === 0) break;

    conversation.push({ role: "assistant", content: response.content });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toolResults: any[] = [];
    for (const tu of toolUses) {
      if (!toolsUsadas.includes(tu.name)) toolsUsadas.push(tu.name);
      try {
        const result = await executeTool(tu.name, tu.input);
        toolResults.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content: JSON.stringify(result),
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        toolResults.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content: `Error: ${message}`,
          is_error: true,
        });
      }
    }
    conversation.push({ role: "user", content: toolResults });
  }

  return { texto: textoFinal.trim(), toolsUsadas };
}
