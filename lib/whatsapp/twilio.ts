import twilio from "twilio";

const MAX_LEN = 1200; // margen para el límite de WhatsApp
const MAX_CHUNKS = 2; // enviamos como máximo 2 chunks reales + aviso
const RATE_MS = 3200; // el sandbox permite ~1 mensaje cada 3 s
const RECORTE = "_Pregunta por un tema específico si quieres más detalle._";

const NUM = new Intl.NumberFormat("es-CO");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function getTwilioClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) throw new Error("Faltan TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN");
  return twilio(sid, token);
}

/** Parte un texto en fragmentos <= MAX_LEN respetando saltos de línea. */
export function partirMensaje(texto: string, max = MAX_LEN): string[] {
  if (texto.length <= max) return [texto];
  const chunks: string[] = [];
  let actual = "";
  for (const linea of texto.split("\n")) {
    // Línea sola más larga que el máximo: partir duro.
    if (linea.length > max) {
      if (actual) {
        chunks.push(actual);
        actual = "";
      }
      for (let i = 0; i < linea.length; i += max) chunks.push(linea.slice(i, i + max));
      continue;
    }
    if ((actual + "\n" + linea).length > max) {
      chunks.push(actual);
      actual = linea;
    } else {
      actual = actual ? `${actual}\n${linea}` : linea;
    }
  }
  if (actual) chunks.push(actual);
  return chunks;
}

/**
 * Envía uno o varios mensajes de WhatsApp respetando el rate limit del
 * sandbox (~1 msg cada 3 s). Máximo 3 mensajes; si sobra, se recorta.
 * Devuelve los SIDs.
 */
export async function enviarWhatsApp(to: string, body: string): Promise<string[]> {
  const client = getTwilioClient();
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!from) throw new Error("Falta TWILIO_WHATSAPP_FROM");

  let partes = partirMensaje(body);
  // Más de 2 chunks: enviamos los 2 primeros + un aviso corto de recorte.
  if (partes.length > MAX_CHUNKS) {
    partes = [...partes.slice(0, MAX_CHUNKS), RECORTE];
  }

  const inicio = Date.now();
  const sids: string[] = [];
  for (let i = 0; i < partes.length; i++) {
    const msg = await client.messages.create({ from, to, body: partes[i] });
    sids.push(msg.sid);
    // Espera entre mensajes, pero no después del último.
    if (i < partes.length - 1) await sleep(RATE_MS);
  }

  console.log(
    `[whatsapp] enviados ${partes.length} mensaje(s) en ${Date.now() - inicio}ms`
  );
  return sids;
}

/**
 * Convierte el markdown del agente al formato de WhatsApp:
 *  - **negrita** → *negrita*
 *  - encabezados (#, ##) → *texto*
 *  - tablas markdown → líneas con viñetas (no se ven bien como tablas)
 *  - código inline `x` → x
 */
export function formatearParaWhatsApp(texto: string): string {
  const lineas = texto.replace(/\r\n/g, "\n").split("\n");
  const salida: string[] = [];

  let i = 0;
  while (i < lineas.length) {
    const linea = lineas[i];

    // Bloque de tabla: fila con | seguida de separador ---
    const esFilaTabla = linea.includes("|");
    const esSeparador =
      i + 1 < lineas.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lineas[i + 1]) && lineas[i + 1].includes("-");
    if (esFilaTabla && esSeparador) {
      // header
      salida.push(`*${celdas(linea).join(" · ")}*`);
      i += 2; // salta header + separador
      while (i < lineas.length && lineas[i].includes("|") && lineas[i].trim() !== "") {
        salida.push(`• ${celdas(lineas[i]).join(" · ")}`);
        i++;
      }
      continue;
    }

    salida.push(linea);
    i++;
  }

  let out = salida.join("\n");

  // Líneas que son solo separadores (---, ===, ***) → fuera
  out = out.replace(/^\s*([-=*])\1{2,}\s*$/gm, "");
  // Encabezados (###, ##) → *texto*
  out = out.replace(/^\s{0,3}#{1,6}\s+(.+)$/gm, "*$1*");
  // **negrita** → *negrita*
  out = out.replace(/\*\*(.+?)\*\*/g, "*$1*");
  // Viñetas "- " o "* " al inicio → "• "
  out = out.replace(/^\s*[-*]\s+/gm, "• ");
  // snake_case → palabras separadas (cero_verificado → cero verificado)
  out = out.replace(/([a-záéíóúñ0-9])_(?=[a-záéíóúñ0-9])/gi, "$1 ");
  // Código inline `x` → x
  out = out.replace(/`([^`]+)`/g, "$1");
  // Enteros de 5+ dígitos → separador de miles es-CO (no toca años de 4)
  out = out.replace(/\b\d{5,}\b/g, (m) => NUM.format(Number(m)));
  // Colapsa 3+ saltos en 2
  out = out.replace(/\n{3,}/g, "\n\n");

  return out.trim();
}

function celdas(fila: string): string[] {
  return fila
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim())
    .filter(Boolean);
}
