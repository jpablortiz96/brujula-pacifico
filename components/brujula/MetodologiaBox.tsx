import { ChevronRight } from "lucide-react";

const COMPONENTES = [
  {
    peso: "40%",
    titulo: "Baja inversión per cápita",
    detalle:
      "Pesos COP de contratos SECOP por persona vulnerable. Menos inversión → más olvido.",
  },
  {
    peso: "30%",
    titulo: "Proporción de vulnerabilidad",
    detalle:
      "Porcentaje de población en grupos Sisbén A/B (pobreza extrema y moderada).",
  },
  {
    peso: "30%",
    titulo: "Violencia relativa",
    detalle: "Homicidios registrados por Medicina Legal, normalizados.",
  },
];

const FUENTES = [
  { label: "SECOP II — Contratos", id: "jbjy-vk9h" },
  { label: "Sisbén IV — DNP", id: "hq2v-5umk" },
  { label: "Lesiones fatales — Medicina Legal", id: "2kpj-cktv" },
];

export default function MetodologiaBox() {
  return (
    <details
      className="bg-white group"
      style={{ border: "2px solid rgb(10 37 64)", borderRadius: 4 }}
    >
      <summary
        className="flex items-center gap-2 px-4 py-3 cursor-pointer select-none"
        style={{ listStyle: "none" }}
      >
        <ChevronRight
          size={16}
          className="text-gov-azul transition-transform group-open:rotate-90"
        />
        <span className="text-gov-azul" style={{ fontSize: 15, fontWeight: 600 }}>
          ¿Cómo se calcula el score de olvido?
        </span>
      </summary>

      <div
        className="px-4 pb-4 pt-1"
        style={{ borderTop: "0.5px solid rgb(10 37 64 / 0.15)" }}
      >
        {/* Fórmula */}
        <div
          className="my-3 p-3 gov-mono text-gov-azul"
          style={{ background: "rgb(244 242 236)", borderRadius: 4, fontSize: 12.5 }}
        >
          Score = 40% baja inversión per cápita + 30% proporción de
          vulnerabilidad + 30% violencia relativa
        </div>

        {/* Componentes */}
        <div className="space-y-2">
          {COMPONENTES.map((c) => (
            <div key={c.titulo} className="flex gap-3">
              <span
                className="gov-mono flex-shrink-0 text-center"
                style={{
                  background: "rgb(10 37 64)",
                  color: "#fff",
                  borderRadius: 3,
                  padding: "2px 6px",
                  fontSize: 11,
                  minWidth: 42,
                }}
              >
                {c.peso}
              </span>
              <p style={{ fontSize: 13 }}>
                <strong className="text-gov-azul">{c.titulo}.</strong>{" "}
                <span className="text-gov-muted">{c.detalle}</span>
              </p>
            </div>
          ))}
        </div>

        {/* Nota clave */}
        <div
          className="mt-3 p-3"
          style={{
            borderLeft: "4px solid rgb(255 205 0)",
            background: "rgb(249 250 251)",
            borderRadius: 4,
            fontSize: 12.5,
          }}
        >
          <span className="text-gov-azul" style={{ fontWeight: 500 }}>
            Rigor estadístico:
          </span>{" "}
          <span className="text-gov-muted">
            la población vulnerable se estima con el factor de expansión (fex)
            del DANE sobre el censo Sisbén, no sobre la muestra. Solo se rankean
            municipios con muestra local ≥30 registros; los demás se reportan
            aparte para verificación.
          </span>
        </div>

        {/* Fuentes */}
        <div className="mt-3">
          <p className="gov-label text-gov-muted mb-1.5" style={{ fontSize: 10 }}>
            📊 Fuentes · datos.gov.co
          </p>
          <div className="flex flex-wrap gap-2">
            {FUENTES.map((f) => (
              <a
                key={f.id}
                href={`https://www.datos.gov.co/d/${f.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5"
                style={{
                  border: "1px solid rgb(10 37 64)",
                  background: "#fff",
                  padding: "3px 9px",
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 500,
                  color: "rgb(10 37 64)",
                }}
              >
                {f.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </details>
  );
}
