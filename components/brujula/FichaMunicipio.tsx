"use client";

import { MapPinned, ArrowRight, Sparkles } from "lucide-react";
import BotonBrief from "./BotonBrief";
import DescargarPaquete from "./DescargarPaquete";
import { useRol } from "@/lib/context/RolContext";
import type { ZonaOlvidada } from "@/lib/queries/zonas";
import {
  categoriaStyle,
  formatCOP,
  formatCOPCompact,
  formatNum,
} from "@/lib/zonas-ui";
import {
  traducirVulnerabilidad,
  traducirInversion,
  traducirHomicidios,
  traducirCategoria,
  traducirScore,
  traducirCalidadSecop,
} from "@/lib/traduccion-ciudadana";

const AMBAR = "#EF9F27";

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="bg-white p-3"
      style={{ border: "0.5px solid rgb(10 37 64)", borderRadius: 4 }}
    >
      <p className="gov-label text-gov-muted" style={{ fontSize: 10 }}>
        {label}
      </p>
      <p
        className="tabular-nums text-gov-azul mt-1"
        style={{ fontSize: 20, fontWeight: 500, lineHeight: 1.15 }}
      >
        {value}
      </p>
    </div>
  );
}

/** Tarjeta de texto legible para la vista ciudadana. */
function TextoCard({ texto, accent }: { texto: string; accent: string }) {
  return (
    <div
      className="p-3"
      style={{
        border: "0.5px solid rgb(10 37 64 / 0.25)",
        borderLeft: `4px solid ${accent}`,
        borderRadius: 4,
        background: "#fff",
      }}
    >
      <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "rgb(10 37 64)" }}>
        {texto}
      </p>
    </div>
  );
}

export default function FichaMunicipio({ zona }: { zona: ZonaOlvidada | null }) {
  const { rol } = useRol();

  if (!zona) {
    return (
      <div
        className="bg-white h-full flex flex-col items-center justify-center text-center p-8"
        style={{ border: "2px solid rgb(10 37 64)", borderRadius: 4, minHeight: 280 }}
      >
        <MapPinned size={32} className="text-gov-muted mb-3" />
        <p className="text-gov-muted" style={{ fontSize: 14, maxWidth: 320 }}>
          Selecciona un municipio en el mapa o el ranking para ver su ficha
          detallada.
        </p>
      </div>
    );
  }

  const cat = categoriaStyle(zona.categoria);
  const confianzaAlta = zona.confianza === "Alta";
  const ciudadano = rol === "ciudadano";
  const sinInversion =
    zona.inversion_per_vulnerable == null || zona.inversion_per_vulnerable === 0;
  const posibleSubregistro =
    zona.contratos === 0 && zona.calidad_dato_secop === "posible_subregistro";
  const calidadTexto = traducirCalidadSecop(zona.calidad_dato_secop);

  return (
    <div
      className="bg-white h-full flex flex-col"
      style={{ border: "2px solid rgb(10 37 64)", borderRadius: 4 }}
    >
      {/* Header */}
      <div className="p-4" style={{ borderBottom: "0.5px solid rgb(10 37 64 / 0.2)" }}>
        {/* Badge de modo */}
        <span
          className="gov-label inline-block mb-2"
          style={{
            fontSize: 9,
            padding: "2px 7px",
            borderRadius: 3,
            background: ciudadano ? "rgb(255 205 0)" : "rgb(10 37 64)",
            color: ciudadano ? "rgb(10 37 64)" : "#fff",
            letterSpacing: "0.08em",
          }}
        >
          {ciudadano ? "Vista ciudadana" : "Vista funcionario"}
        </span>

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3
              className="text-gov-azul"
              style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.15 }}
            >
              {zona.nombre}
            </h3>
            <p className="gov-label text-gov-muted mt-0.5" style={{ fontSize: 11 }}>
              {ciudadano
                ? zona.departamento
                : `${zona.departamento} · DIVIPOLA ${zona.divipola}`}
            </p>
          </div>
          <span
            className="gov-pill flex-shrink-0"
            style={{ background: cat.solid, color: "#fff" }}
          >
            {zona.categoria}
          </span>
        </div>

        {/* La jerga técnica (confianza/score) solo en modo funcionario */}
        {!ciudadano && (
          <div className="flex items-center gap-2 mt-3">
            <span
              className="gov-pill"
              style={{
                background: confianzaAlta ? "rgb(26 135 84)" : "rgb(92 107 122)",
                color: "#fff",
              }}
            >
              Confianza {zona.confianza}
            </span>
            <span className="gov-mono text-gov-muted" style={{ fontSize: 11 }}>
              Score de olvido: {zona.score_olvido.toFixed(3)}
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4 flex-1 flex flex-col gap-3">
        {ciudadano ? (
          // ── Vista ciudadana: frases, no jerga ──────────────────────────
          <div className="space-y-2">
            <TextoCard texto={traducirCategoria(zona.categoria)} accent={cat.solid} />
            {zona.pct_vulnerable != null && (
              <TextoCard
                texto={traducirVulnerabilidad(zona.pct_vulnerable)}
                accent="rgb(10 37 64)"
              />
            )}
            <TextoCard
              texto={
                traducirInversion(zona.inversion_per_vulnerable, zona.contratos) +
                (posibleSubregistro && calidadTexto ? " " + calidadTexto : "")
              }
              accent={posibleSubregistro ? AMBAR : sinInversion ? "rgb(206 17 38)" : "rgb(26 135 84)"}
            />
            <TextoCard texto={traducirHomicidios(zona.homicidios)} accent="rgb(206 17 38)" />
            <TextoCard texto={traducirScore(zona.score_olvido)} accent="rgb(255 205 0)" />
          </div>
        ) : (
          // ── Vista funcionario: cifras técnicas (sin cambios) ───────────
          <>
            <div className="grid grid-cols-2 gap-2">
              <MiniMetric label="Contratos SECOP" value={formatNum(zona.contratos)} />
              <MiniMetric label="Valor contratado" value={formatCOPCompact(zona.valor_secop_cop)} />
              <MiniMetric
                label="Pobl. vulnerable est."
                value={formatNum(zona.poblacion_vulnerable_estimada)}
              />
              <MiniMetric
                label="% vulnerabilidad"
                value={zona.pct_vulnerable != null ? `${zona.pct_vulnerable}%` : "—"}
              />
            </div>

            <div
              className="p-3"
              style={{
                border: `0.5px solid ${sinInversion ? (posibleSubregistro ? AMBAR : "rgb(206 17 38)") : "rgb(10 37 64)"}`,
                borderLeft: `4px solid ${sinInversion ? (posibleSubregistro ? AMBAR : "rgb(206 17 38)") : "rgb(10 37 64)"}`,
                borderRadius: 4,
                background: sinInversion
                  ? posibleSubregistro
                    ? "rgba(239,159,39,0.06)"
                    : "rgba(206,17,38,0.04)"
                  : "#fff",
              }}
            >
              <p className="gov-label text-gov-muted" style={{ fontSize: 10 }}>
                Inversión por persona vulnerable
              </p>
              {sinInversion ? (
                posibleSubregistro ? (
                  <>
                    <p className="mt-1" style={{ fontSize: 15, fontWeight: 600, color: AMBAR, lineHeight: 1.3 }}>
                      Sin contratos geolocalizados
                    </p>
                    <p className="text-gov-muted mt-1" style={{ fontSize: 11 }}>
                      Puede haber inversión registrada a nivel departamental sin
                      asignación municipal. Requiere verificación antes de concluir
                      abandono.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="tabular-nums mt-1" style={{ fontSize: 22, fontWeight: 600, color: "rgb(206 17 38)" }}>
                      $0 — abandono confirmado
                    </p>
                    <p className="text-gov-muted mt-0.5" style={{ fontSize: 11 }}>
                      Sin contratos registrados. El departamento está bien
                      geolocalizado (cero verificado).
                    </p>
                  </>
                )
              ) : (
                <>
                  <p className="tabular-nums text-gov-azul mt-1" style={{ fontSize: 26, fontWeight: 600 }}>
                    {formatCOP(zona.inversion_per_vulnerable)}
                  </p>
                  <p className="text-gov-muted mt-0.5" style={{ fontSize: 11 }}>
                    COP por persona vulnerable estimada (población expandida DANE).
                  </p>
                </>
              )}
            </div>

            <div className="flex items-center justify-between px-1">
              <span className="text-gov-muted" style={{ fontSize: 13 }}>
                Homicidios (Medicina Legal)
              </span>
              <span className="tabular-nums text-gov-azul" style={{ fontSize: 16, fontWeight: 600 }}>
                {formatNum(zona.homicidios)}
              </span>
            </div>
          </>
        )}

        {/* Acciones (compartidas) */}
        <div className="mt-auto space-y-2 pt-1">
          <BotonBrief divipola={zona.divipola} tipo="zona_olvidada" nombre={zona.nombre} />
          <DescargarPaquete divipola={zona.divipola} nombre={zona.nombre} />
          <a
            href={`/agente?q=${encodeURIComponent("Analiza en profundidad " + zona.nombre)}`}
            className="flex items-center justify-center gap-2 transition-opacity"
            style={{
              background: "rgb(10 37 64)",
              color: "#fff",
              borderRadius: 4,
              padding: "10px 14px",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            <Sparkles size={15} className="text-gov-amarillo" />
            {ciudadano ? "Preguntar al asistente" : "Analizar con el copiloto IA"}
            <ArrowRight size={15} />
          </a>
        </div>
      </div>
    </div>
  );
}
