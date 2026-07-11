import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });
  }
  return _client;
}

export const BRUJULA_MODEL = "claude-sonnet-5" as const;

export const SYSTEM_PROMPT = `Eres BRÚJULA, un sistema de inteligencia territorial para el Pacífico colombiano.
Analizas datos abiertos del Estado (SECOP, salud, educación, pobreza) para identificar donde el dinero se gastó pero el territorio sigue olvidado.
Respondes siempre en español. Eres directo, preciso y orientado a la acción.
Cuando detectas anomalías (contratos sin impacto, indicadores críticos sin inversión) los señalas con evidencia específica.
Nunca inventas datos — solo analizas lo que tienes en contexto.` as const;
