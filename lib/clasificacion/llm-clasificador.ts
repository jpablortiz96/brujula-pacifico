import Anthropic from "@anthropic-ai/sdk";
import { SECTORES } from "./sectores";

// Cliente lazy: se crea al primer uso, no al importar el módulo. Evita que
// se construya antes de que un script cargue las variables de entorno.
let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  return _client;
}

// Modelo barato para clasificación masiva.
const HAIKU = "claude-haiku-4-5-20251001";

// Pedimos ÍNDICES (0..N-1) en vez de strings largos: la salida es diminuta
// y no se trunca por max_tokens, mucho más robusto de parsear.
const LISTA = SECTORES.map((s, i) => `${i}=${s}`).join(", ");
const SYSTEM =
  "Clasificas objetos de contratos públicos colombianos en sectores. " +
  "Sectores (índice=nombre): " +
  LISTA +
  ". Responde SOLO con un array JSON de enteros, uno por objeto, en el mismo " +
  "orden, con el índice del sector. Sin preámbulo, sin markdown, solo el JSON. " +
  'Ejemplo: [0,10,3]';

/**
 * Clasifica hasta 25 objetos de contrato con el LLM barato.
 * Devuelve un array de sectores del mismo largo (rellena con "Otro").
 */
export async function clasificarConLLM(objetos: string[]): Promise<string[]> {
  if (objetos.length === 0) return [];
  const fallback = objetos.map(() => "Otro");

  const user =
    "Clasifica estos objetos de contrato (devuelve " +
    objetos.length +
    " índices):\n" +
    objetos.map((o, i) => `${i + 1}. ${o.slice(0, 240)}`).join("\n");

  try {
    const res = await client().messages.create({
      model: HAIKU,
      max_tokens: 512,
      temperature: 0,
      system: SYSTEM,
      messages: [{ role: "user", content: user }],
    });

    const texto = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    // Extrae el primer array [ ... ] aunque venga con texto/fences alrededor.
    const match = texto.match(/\[[\s\S]*?\]/);
    if (!match) return fallback;
    const arr = JSON.parse(match[0]);
    if (!Array.isArray(arr)) return fallback;

    return objetos.map((_, i) => {
      const idx = Number(arr[i]);
      return Number.isInteger(idx) && idx >= 0 && idx < SECTORES.length
        ? SECTORES[idx]
        : "Otro";
    });
  } catch {
    return fallback;
  }
}
