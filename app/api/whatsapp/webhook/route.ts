import { after, NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { createAdminClient } from "@/lib/supabase/admin";
import { ejecutarAgente, type AgentMessage } from "@/lib/agent/run-agent";
import { enviarWhatsApp, formatearParaWhatsApp } from "@/lib/whatsapp/twilio";

export const runtime = "nodejs";
export const maxDuration = 60;

const TWIML_VACIO = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
const xml = () =>
  new NextResponse(TWIML_VACIO, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });

const INSTRUCCION_WHATSAPP = `Estás respondiendo por WhatsApp a un ciudadano. Reglas estrictas:

LONGITUD: máximo 900 caracteres. Sé implacable con la brevedad.

ESTRUCTURA obligatoria:
Línea 1: *Título corto* con un emoji al inicio
Cuerpo: máximo 4 viñetas. Cada una con la cifra clave en *negrita*
Una línea de contexto o advertencia si aplica
Cierre: una pregunta de seguimiento corta
Última línea: 📊 Fuentes: nombres separados por coma

LENGUAJE: nunca uses términos técnicos crudos. Traduce siempre:
- 'cero_verificado' → 'sin contratos registrados (confirmado, no es falta de datos)'
- 'posible_subregistro' → 'puede haber inversión no geolocalizada'
- 'DIVIPOLA' → no lo menciones
- 'fex' o 'factor de expansión' → 'población estimada'
- 'score de olvido' → 'nivel de abandono'

NÚMEROS: siempre con separador de miles al estilo colombiano (27.809, no 27809). Moneda como '$11.2 millones' o '$1.1 billones', no cifras crudas gigantes.

FORMATO: solo *negrita* de WhatsApp. Prohibido: tablas markdown, headers con ###, dobles asteriscos **, guiones de lista con -, separadores como --- o ===.
Usa • para viñetas.`;

const BIENVENIDA = `*BRÚJULA* 🧭
Inteligencia territorial del Pacífico colombiano con datos abiertos de datos.gov.co

Pregúntame cosas como:
• ¿Cómo está Tumaco?
• ¿Cuáles son los municipios más olvidados?
• Compara Quibdó con Popayán
• ¿Cuánto se invirtió en Guapi?

Escribe *reiniciar* para empezar de nuevo.`;

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const params: Record<string, string> = {};
  for (const [k, v] of form.entries()) params[k] = String(v);

  const body = (params.Body || "").trim();
  const from = params.From || "";

  // ── Validación de firma de Twilio ───────────────────────────────────────
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const signature = req.headers.get("x-twilio-signature") || "";
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const url = `${proto}://${host}${req.nextUrl.pathname}`;

  if (authToken) {
    const valido = twilio.validateRequest(authToken, signature, url, params);
    if (!valido) {
      if (process.env.NODE_ENV === "production") {
        return new NextResponse("Firma inválida", { status: 401 });
      }
      console.warn("[whatsapp] firma inválida (permitido en dev)");
    }
  }

  if (!from || !body) return xml();

  // ── Trabajo asíncrono: responde el webhook ya, procesa después ──────────
  after(async () => {
    try {
      const lower = body.toLowerCase();

      if (["ayuda", "menu", "menú", "hola"].includes(lower)) {
        await enviarWhatsApp(from, BIENVENIDA);
        return;
      }
      if (lower === "reiniciar") {
        await reiniciarSesion(from);
        await enviarWhatsApp(
          from,
          "Listo, empecé de nuevo. Escribe *ayuda* para ver ejemplos."
        );
        return;
      }

      const historial = await leerHistorial(from);
      // Ack inmediato mientras el agente trabaja.
      await enviarWhatsApp(from, "🔍 Consultando datos abiertos…");

      const messages: AgentMessage[] = [
        ...historial,
        { role: "user", content: body },
      ];
      const { texto, toolsUsadas } = await ejecutarAgente(
        messages,
        "ciudadano",
        4,
        INSTRUCCION_WHATSAPP
      );

      const respuesta =
        texto || "No pude generar una respuesta. Intenta reformular tu pregunta.";
      await enviarWhatsApp(from, formatearParaWhatsApp(respuesta));

      // Historial truncado a los últimos 6 mensajes.
      const nuevoHistorial: AgentMessage[] = [
        ...messages,
        { role: "assistant" as const, content: respuesta },
      ].slice(-6);
      await guardarSesion(from, nuevoHistorial);

      // Bitácora.
      await registrarBitacora(from, body, respuesta, toolsUsadas);
    } catch (err) {
      console.error("[whatsapp] error procesando:", err);
      try {
        await enviarWhatsApp(
          from,
          "Tuve un problema consultando los datos. Intenta de nuevo en un momento."
        );
      } catch {
        /* nada más que hacer */
      }
    }
  });

  return xml();
}

// ─── Persistencia de sesión ──────────────────────────────────────────────
async function leerHistorial(telefono: string): Promise<AgentMessage[]> {
  const sb = createAdminClient();
  const { data } = await sb
    .from("whatsapp_sesiones")
    .select("historial")
    .eq("telefono", telefono)
    .single();
  const h = data?.historial;
  return Array.isArray(h) ? (h as AgentMessage[]) : [];
}

async function guardarSesion(telefono: string, historial: AgentMessage[]) {
  const sb = createAdminClient();
  // total_mensajes: leemos y sumamos (best-effort).
  const { data } = await sb
    .from("whatsapp_sesiones")
    .select("total_mensajes")
    .eq("telefono", telefono)
    .single();
  const total = (data?.total_mensajes ?? 0) + 1;
  await sb.from("whatsapp_sesiones").upsert({
    telefono,
    historial,
    ultima_actividad: new Date().toISOString(),
    total_mensajes: total,
  });
}

async function reiniciarSesion(telefono: string) {
  const sb = createAdminClient();
  await sb
    .from("whatsapp_sesiones")
    .upsert({ telefono, historial: [], ultima_actividad: new Date().toISOString() });
}

async function registrarBitacora(
  telefono: string,
  consulta: string,
  respuesta: string,
  tools: string[]
) {
  try {
    const sb = createAdminClient();
    await sb.from("bitacora").insert({
      actor_rol: "ciudadano_whatsapp",
      municipio_divipola: null,
      consulta,
      datasets_usados: tools,
      decision: respuesta.slice(0, 1000),
      confianza: null,
      metadata: {
        canal: "whatsapp",
        telefono_hash: telefono.slice(-4), // solo últimos 4 dígitos
      },
    });
  } catch (err) {
    console.error("[whatsapp] bitácora falló:", err);
  }
}
