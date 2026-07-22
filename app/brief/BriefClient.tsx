"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight, FileText, Check } from "lucide-react";
import SelectorMunicipio from "@/components/brujula/SelectorMunicipio";
import BotonBrief from "@/components/brujula/BotonBrief";
import {
  getMunicipiosEstaticos,
  type MunicipioSeleccionable,
} from "@/lib/data/municipios-estaticos";

type TipoBrief = "municipio" | "zona_olvidada";

const TIPOS: { value: TipoBrief; label: string; desc: string }[] = [
  { value: "municipio", label: "Ficha territorial", desc: "Situación general del municipio con las 4 fuentes." },
  { value: "zona_olvidada", label: "Alerta de zona olvidada", desc: "Enfocado en el hallazgo del detector de abandono." },
];

const SECCIONES = [
  "Resumen ejecutivo",
  "Indicadores clave",
  "Prioridades sugeridas",
  "Metodología y transparencia",
  "4 fuentes citadas (datos.gov.co)",
];

export default function BriefClient() {
  const [municipios, setMunicipios] = useState<MunicipioSeleccionable[]>(
    getMunicipiosEstaticos
  );
  const [divipola, setDivipola] = useState<string | null>(null);
  const [tipo, setTipo] = useState<TipoBrief>("municipio");

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await fetch("/api/comparador");
        const json = await res.json();
        if (!cancel) setMunicipios(json.municipios ?? []);
      } catch {
        /* silencioso */
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const seleccionado = useMemo(
    () => municipios.find((m) => m.divipola === divipola) ?? null,
    [municipios, divipola]
  );

  return (
    <div className="max-w-2xl mx-auto w-full space-y-5">
      <div>
        <nav className="flex items-center gap-1 gov-label text-gov-muted mb-2" style={{ fontSize: 10 }}>
          <span>BRÚJULA</span>
          <ChevronRight size={11} />
          <span className="text-gov-azul">Brief ejecutivo</span>
        </nav>
        <h1 className="flex items-center gap-2 text-gov-azul" style={{ fontSize: 28, fontWeight: 600, lineHeight: 1.1 }}>
          <FileText size={24} /> Generador de brief ejecutivo
        </h1>
        <p className="text-gov-muted mt-1" style={{ fontSize: 14, maxWidth: 560 }}>
          Documentos oficiales descargables con datos verificables y citaciones
          a datos.gov.co.
        </p>
      </div>

      {/* Selector municipio */}
      <SelectorMunicipio
        municipios={municipios}
        value={divipola}
        onChange={setDivipola}
        label="Municipio"
      />

      {/* Tipo de brief (radios) */}
      <div>
        <p className="gov-label text-gov-muted mb-2" style={{ fontSize: 10 }}>
          Tipo de documento
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TIPOS.map((t) => {
            const activo = tipo === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setTipo(t.value)}
                className="text-left p-3 transition-colors"
                style={{
                  border: `2px solid ${activo ? "rgb(10 37 64)" : "rgb(10 37 64 / 0.3)"}`,
                  borderLeft: `4px solid ${activo ? "rgb(255 205 0)" : "rgb(10 37 64 / 0.3)"}`,
                  borderRadius: 4,
                  background: activo ? "rgb(244 242 236)" : "#fff",
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="flex-shrink-0 flex items-center justify-center"
                    style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgb(10 37 64)", background: activo ? "rgb(10 37 64)" : "#fff" }}
                  >
                    {activo && <Check size={10} className="text-white" />}
                  </span>
                  <span className="text-gov-azul" style={{ fontSize: 14, fontWeight: 600 }}>{t.label}</span>
                </div>
                <p className="text-gov-muted mt-1" style={{ fontSize: 12, lineHeight: 1.4 }}>{t.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Preview de secciones */}
      <div className="bg-white p-4" style={{ border: "0.5px solid rgb(10 37 64)", borderRadius: 4 }}>
        <p className="gov-label text-gov-muted mb-2" style={{ fontSize: 10 }}>
          El PDF incluirá
        </p>
        <ul className="space-y-1.5">
          {SECCIONES.map((s) => (
            <li key={s} className="flex items-center gap-2 text-gov-azul" style={{ fontSize: 13.5 }}>
              <Check size={14} className="text-gov-verde flex-shrink-0" />
              {s}
            </li>
          ))}
        </ul>
      </div>

      {/* Acción */}
      {seleccionado ? (
        <BotonBrief
          divipola={seleccionado.divipola}
          tipo={tipo}
          nombre={seleccionado.nombre}
          labelText={`Descargar brief de ${seleccionado.nombre}`}
        />
      ) : (
        <div
          className="p-4 text-center text-gov-muted"
          style={{ border: "2px dashed rgb(10 37 64 / 0.35)", borderRadius: 4, fontSize: 13 }}
        >
          Selecciona un municipio para generar su brief.
        </div>
      )}

      <p className="text-gov-muted" style={{ fontSize: 11, lineHeight: 1.5 }}>
        Los documentos no constituyen acto administrativo. Cifras sujetas a
        verificación en datos.gov.co.
      </p>
    </div>
  );
}
