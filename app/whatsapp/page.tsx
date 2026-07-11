import GovHeader from "@/components/brujula/GovHeader";
import GovSidebar from "@/components/brujula/GovSidebar";
import { MessageCircle, ChevronRight, ExternalLink } from "lucide-react";

export const metadata = {
  title: "BRÚJULA por WhatsApp",
};

const NUMERO = "+1 415 523 8886"; // número del sandbox de Twilio
const WA_LINK = "https://wa.me/14155238886?text=join%20%3Ccodigo%3E";

const EJEMPLOS = [
  "¿Cómo está Tumaco?",
  "¿Cuáles son los municipios más olvidados?",
  "Compara Quibdó con Popayán",
  "¿Cuánto se invirtió en Guapi?",
];

export default function WhatsAppPage() {
  return (
    <div className="h-screen flex flex-col bg-gov-bone overflow-hidden">
      <GovHeader />
      <div className="flex flex-1 overflow-hidden">
        <GovSidebar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 min-w-0">
          <div className="max-w-2xl mx-auto w-full space-y-5">
            <div>
              <nav className="flex items-center gap-1 gov-label text-gov-muted mb-2" style={{ fontSize: 10 }}>
                <span>BRÚJULA</span>
                <ChevronRight size={11} />
                <span className="text-gov-azul">WhatsApp</span>
              </nav>
              <h1 className="flex items-center gap-2 text-gov-azul" style={{ fontSize: 28, fontWeight: 600, lineHeight: 1.1 }}>
                <MessageCircle size={24} /> BRÚJULA por WhatsApp
              </h1>
              <p className="text-gov-muted mt-1" style={{ fontSize: 14, maxWidth: 560 }}>
                Consulta datos territoriales sin necesidad de computador. Pensado
                para líderes comunitarios y territorios con baja conectividad.
              </p>
            </div>

            {/* Cómo conectarse */}
            <div className="bg-white p-5" style={{ border: "2px solid rgb(10 37 64)", borderRadius: 4 }}>
              <p className="gov-label text-gov-muted mb-3" style={{ fontSize: 10 }}>
                Cómo conectarse al sandbox
              </p>
              <ol className="space-y-3">
                <Paso n={1}>
                  Guarda el número{" "}
                  <span className="gov-mono text-gov-azul" style={{ fontWeight: 600 }}>{NUMERO}</span>{" "}
                  en tus contactos.
                </Paso>
                <Paso n={2}>
                  Envíale por WhatsApp el mensaje{" "}
                  <span className="gov-mono" style={{ background: "rgb(244 242 236)", padding: "1px 6px", borderRadius: 3 }}>
                    join &lt;código&gt;
                  </span>{" "}
                  (el código aparece en tu consola de Twilio Sandbox).
                </Paso>
                <Paso n={3}>
                  Ya puedes preguntar. Escribe{" "}
                  <span className="gov-mono" style={{ fontWeight: 600 }}>ayuda</span> para ver el menú.
                </Paso>
              </ol>

              <a
                href={WA_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2"
                style={{
                  background: "rgb(26 135 84)",
                  color: "#fff",
                  borderRadius: 4,
                  padding: "10px 16px",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                <MessageCircle size={16} /> Abrir WhatsApp <ExternalLink size={14} />
              </a>
            </div>

            {/* Ejemplos */}
            <div className="bg-white p-5" style={{ border: "0.5px solid rgb(10 37 64)", borderRadius: 4 }}>
              <p className="gov-label text-gov-muted mb-2" style={{ fontSize: 10 }}>
                Ejemplos de preguntas
              </p>
              <ul className="space-y-1.5">
                {EJEMPLOS.map((e) => (
                  <li key={e} className="flex gap-2 text-gov-azul" style={{ fontSize: 14 }}>
                    <span className="text-gov-amarillo">▸</span>
                    <span>{e}</span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-gov-muted" style={{ fontSize: 11 }}>
              Versión de demostración con Twilio Sandbox. Las respuestas usan datos
              abiertos de datos.gov.co procesados por el agente de BRÚJULA.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

function Paso({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3" style={{ fontSize: 14 }}>
      <span
        className="gov-mono flex-shrink-0 flex items-center justify-center"
        style={{ background: "rgb(10 37 64)", color: "#fff", width: 22, height: 22, borderRadius: 4, fontSize: 12, fontWeight: 700 }}
      >
        {n}
      </span>
      <span className="text-gov-azul" style={{ lineHeight: 1.5 }}>{children}</span>
    </li>
  );
}
