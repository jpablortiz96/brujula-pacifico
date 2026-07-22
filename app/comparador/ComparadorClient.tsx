"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, ChevronRight } from "lucide-react";
import SelectorMunicipio from "@/components/brujula/SelectorMunicipio";
import FilaComparativa, {
  type FormatoComparativo,
  type MejorEs,
} from "@/components/brujula/FilaComparativa";
import BotonBrief from "@/components/brujula/BotonBrief";
import BotonExportar from "@/components/brujula/BotonExportar";
import { useRol } from "@/lib/context/RolContext";
import {
  getMunicipiosEstaticos,
  type MunicipioSeleccionable,
} from "@/lib/data/municipios-estaticos";
import type { MunicipioComparable, MunicipioLista } from "@/lib/queries/comparador";

// Comparaciones sugeridas con contraste fuerte (guían al usuario a
// comparaciones con sustancia). Códigos DIVIPOLA reales verificados.
const SUGERENCIAS: { label: string; a: string; b: string }[] = [
  { label: "Tumaco vs Cali", a: "52835", b: "76001" },
  { label: "Quibdó vs Popayán", a: "27001", b: "19001" },
  { label: "Buenaventura vs Cali", a: "76109", b: "76001" },
  { label: "Guapi vs Pasto", a: "19300", b: "52001" }, // Guapi = 19300 (no 19318)
];

// Métricas a comparar (clave, etiqueta, formato, criterio de "mejor").
const METRICAS: {
  key: keyof MunicipioComparable;
  label: string;
  formato: FormatoComparativo;
  mejorEs: MejorEs;
}[] = [
  { key: "contratos", label: "Contratos SECOP", formato: "numero", mejorEs: "mayor" },
  { key: "valor_secop_cop", label: "Valor total contratado", formato: "moneda", mejorEs: "mayor" },
  { key: "inversion_per_vulnerable", label: "Inversión por persona vulnerable", formato: "moneda", mejorEs: "mayor" },
  { key: "poblacion_vulnerable", label: "Población vulnerable estimada", formato: "numero", mejorEs: "neutro" },
  { key: "pct_vulnerable", label: "% vulnerabilidad", formato: "porcentaje", mejorEs: "menor" },
  { key: "estab_total", label: "Establecimientos educativos", formato: "numero", mejorEs: "mayor" },
  { key: "homicidios", label: "Homicidios (Medicina Legal)", formato: "numero", mejorEs: "menor" },
];

const NUM = new Intl.NumberFormat("es-CO");

function multiplo(a: number, b: number): string {
  if (Math.min(a, b) === 0) return "muchísimos";
  const m = Math.max(a, b) / Math.min(a, b);
  return m < 10 ? `${Math.round(m * 10) / 10}×` : `${Math.round(m)}×`;
}

function veredicto(
  a: MunicipioComparable,
  b: MunicipioComparable,
  ciudadano: boolean
): string {
  const pctTxt = (m: MunicipioComparable) =>
    m.pct_vulnerable != null ? `${m.pct_vulnerable}%` : "una alta";

  // ── Ambos en cero ───────────────────────────────────────────────────────
  if (a.contratos === 0 && b.contratos === 0) {
    if (ciudadano)
      return (
        `Ni ${a.nombre} ni ${b.nombre} registran contratos públicos, a pesar de ` +
        `que su gente tiene necesidades. Los dos necesitan más atención del Estado.`
      );
    return (
      `Ninguno de los dos municipios registra contratación pública en SECOP, ` +
      `pese a su población vulnerable. Ambos requieren atención del Estado.`
    );
  }

  // ── Uno con datos, otro en cero ─────────────────────────────────────────
  if (a.contratos === 0 || b.contratos === 0) {
    const conDatos = a.contratos > 0 ? a : b;
    const enCero = a.contratos > 0 ? b : a;
    if (ciudadano)
      return (
        `Mientras ${conDatos.nombre} recibió inversión pública, ${enCero.nombre} no ` +
        `registra ni un contrato, aunque ${enCero.nombre} tiene ${pctTxt(enCero)} de su ` +
        `gente en pobreza o vulnerabilidad. Es un caso de desatención.`
      );
    return (
      `Mientras ${conDatos.nombre} recibió ${NUM.format(conDatos.contratos)} ` +
      `contratos, ${enCero.nombre} no registra inversión pública alguna pese a tener ` +
      `${pctTxt(enCero)} de población vulnerable. Es un caso de desatención territorial.`
    );
  }

  // ── Ambos con datos ─────────────────────────────────────────────────────
  const rich = a.contratos >= b.contratos ? a : b;
  const poor = rich === a ? b : a;
  const multC = multiplo(a.contratos, b.contratos);
  const multV = multiplo(a.valor_secop_cop, b.valor_secop_cop);
  const pct = poor.pct_vulnerable;

  if (ciudadano) {
    return (
      `En ${rich.nombre} el Estado ha contratado mucho más que en ${poor.nombre}. ` +
      (pct != null
        ? `Aunque ${poor.nombre} tiene alta necesidad (${pct}% de su gente en pobreza o vulnerabilidad), `
        : `Aun así, `) +
      `recibe bastante menos inversión pública. Esta desigualdad territorial se ve con datos.`
    );
  }
  return (
    `${rich.nombre} concentra ${multC} más contratos y ${multV} más recursos públicos ` +
    `que ${poor.nombre}` +
    (pct != null ? `, pese a que ${poor.nombre} tiene ${pct}% de vulnerabilidad` : "") +
    `. La brecha territorial es evidente.`
  );
}

interface ListResp {
  municipios?: MunicipioLista[];
}
interface CompResp {
  a?: MunicipioComparable | null;
  b?: MunicipioComparable | null;
  error?: string;
  detalle?: string;
}

export default function ComparadorClient() {
  const { rol } = useRol();
  const ciudadano = rol === "ciudadano";

  const [municipios, setMunicipios] = useState<MunicipioSeleccionable[]>(
    getMunicipiosEstaticos
  );
  const [selA, setSelA] = useState<string | null>("52835"); // Tumaco
  const [selB, setSelB] = useState<string | null>("76001"); // Cali
  const [datA, setDatA] = useState<MunicipioComparable | null>(null);
  const [datB, setDatB] = useState<MunicipioComparable | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lista de municipios al montar.
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await fetch("/api/comparador");
        const json: ListResp = await res.json();
        if (!cancel) setMunicipios(json.municipios ?? []);
      } catch {
        /* la comparación mostrará su propio error */
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  // Comparación cuando ambos están seleccionados.
  useEffect(() => {
    if (!selA || !selB || selA === selB) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/comparador?a=${selA}&b=${selB}`);
        const json: CompResp = await res.json();
        if (!res.ok) throw new Error(json.detalle || json.error || `HTTP ${res.status}`);
        if (cancel) return;
        setDatA(json.a ?? null);
        setDatB(json.b ?? null);
      } catch (err) {
        if (!cancel) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [selA, selB]);

  const ambos = datA && datB && !loading;
  const veredictoTexto = useMemo(
    () => (datA && datB ? veredicto(datA, datB, ciudadano) : ""),
    [datA, datB, ciudadano]
  );

  return (
    <div className="max-w-5xl mx-auto w-full space-y-5">
      {/* Título */}
      <div>
        <nav className="flex items-center gap-1 gov-label text-gov-muted mb-2" style={{ fontSize: 10 }}>
          <span>BRÚJULA</span>
          <ChevronRight size={11} />
          <span className="text-gov-azul">Comparador de municipios</span>
        </nav>
        <h1 className="text-gov-azul" style={{ fontSize: 28, fontWeight: 600, lineHeight: 1.1 }}>
          Comparador de municipios
        </h1>
        <p className="text-gov-muted mt-1" style={{ fontSize: 14, maxWidth: 680 }}>
          Dos municipios lado a lado. La brecha entre ellos, resaltada con datos
          abiertos del Pacífico.
        </p>
      </div>

      {/* Comparaciones sugeridas */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="gov-label text-gov-muted" style={{ fontSize: 10 }}>
          Sugeridas
        </span>
        {SUGERENCIAS.map((s) => {
          const activa = selA === s.a && selB === s.b;
          return (
            <button
              key={s.label}
              type="button"
              onClick={() => {
                setSelA(s.a);
                setSelB(s.b);
              }}
              className="transition-colors"
              style={{
                border: "1px solid rgb(10 37 64)",
                background: activa ? "rgb(10 37 64)" : "#fff",
                color: activa ? "#fff" : "rgb(10 37 64)",
                padding: "4px 10px",
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Selectores */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-end">
        <SelectorMunicipio
          municipios={municipios}
          value={selA}
          onChange={setSelA}
          label="Municipio A"
          excludeDivipola={selB}
        />
        <div className="flex items-center justify-center pb-2">
          <ArrowLeftRight size={20} className="text-gov-muted" />
        </div>
        <SelectorMunicipio
          municipios={municipios}
          value={selB}
          onChange={setSelB}
          label="Municipio B"
          excludeDivipola={selA}
        />
      </div>

      {error && (
        <div
          className="p-4 gov-mono"
          style={{ border: "2px solid rgb(206 17 38)", borderRadius: 4, color: "rgb(206 17 38)", fontSize: 13 }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Tabla comparativa */}
      <div className="bg-white overflow-x-auto" style={{ border: "2px solid rgb(10 37 64)", borderRadius: 4 }}>
       <div style={{ minWidth: 360 }}>
        {/* Cabecera de municipios */}
        <div
          className="grid items-center"
          style={{ gridTemplateColumns: "1fr 1.4fr 1fr", background: "rgb(10 37 64)", color: "#fff" }}
        >
          <MuniHead dato={datA} loading={loading} />
          <div className="text-center gov-label py-3" style={{ fontSize: 10, color: "rgb(200 211 222)" }}>
            vs
          </div>
          <MuniHead dato={datB} loading={loading} />
        </div>

        {/* Filas */}
        {loading || !ambos ? (
          <div className="p-8 text-center animate-pulse text-gov-muted" style={{ fontSize: 13 }}>
            {selA && selB ? "Cargando comparación…" : "Selecciona dos municipios."}
          </div>
        ) : (
          METRICAS.map((m) => (
            <FilaComparativa
              key={m.key}
              label={m.label}
              valorA={(datA![m.key] as number | null) ?? null}
              valorB={(datB![m.key] as number | null) ?? null}
              formato={m.formato}
              mejorEs={m.mejorEs}
              nombreA={datA!.nombre}
              nombreB={datB!.nombre}
            />
          ))
        )}
       </div>
      </div>

      {/* Nota contextual sobre los ceros (no roja, no alarmista) */}
      {ambos &&
        [datA!, datB!]
          .filter((m) => m.contratos === 0)
          .map((m) => <NotaCero key={m.divipola} muni={m} ciudadano={ciudadano} />)}

      {/* Veredicto de brecha */}
      {ambos && (
        <div
          className="p-4"
          style={{
            border: "2px solid rgb(10 37 64)",
            borderLeft: "4px solid rgb(255 205 0)",
            borderRadius: 4,
            background: "#fff",
          }}
        >
          <p className="gov-label text-gov-muted mb-1" style={{ fontSize: 10 }}>
            Veredicto de brecha
          </p>
          <p className="text-gov-azul" style={{ fontSize: 15, lineHeight: 1.55 }}>
            {veredictoTexto}
          </p>
        </div>
      )}

      {/* Acciones: descargar y compartir */}
      {ambos && (
        <div
          className="p-4"
          style={{ border: "2px solid rgb(10 37 64)", borderRadius: 4, background: "#fff" }}
        >
          <p className="gov-label text-gov-muted mb-3" style={{ fontSize: 10 }}>
            Descargar y compartir
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
            <BotonBrief
              divipola={datA!.divipola}
              tipo="municipio"
              nombre={datA!.nombre}
              labelText={`Brief de ${datA!.nombre}`}
            />
            <BotonBrief
              divipola={datB!.divipola}
              tipo="municipio"
              nombre={datB!.nombre}
              labelText={`Brief de ${datB!.nombre}`}
            />
            <BotonExportar
              tipo="comparacion"
              divipolaA={datA!.divipola}
              divipolaB={datB!.divipola}
              label="Exportar comparación (CSV)"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function NotaCero({
  muni,
  ciudadano,
}: {
  muni: MunicipioComparable;
  ciudadano: boolean;
}) {
  const subregistro = muni.calidad_dato_secop === "posible_subregistro";
  const accent = subregistro ? "#EF9F27" : "rgb(10 37 64)";
  let texto: string;
  if (subregistro) {
    texto = ciudadano
      ? `${muni.nombre} no tiene contratos asignados, pero en su región hay inversión que no está bien ubicada por municipio. La cifra podría quedarse corta; conviene verificar.`
      : `${muni.nombre} no registra contratos geolocalizados, pero su departamento tiene contratación sin asignación municipal precisa. La cifra puede subestimar la inversión real. Requiere verificación.`;
  } else {
    texto = ciudadano
      ? `${muni.nombre} no tiene contratos públicos registrados. En su región los datos están completos, así que de verdad ha recibido poca inversión — es un hallazgo importante, no un error.`
      : `${muni.nombre} no registra contratos públicos en SECOP para el periodo analizado. Su departamento está bien geolocalizado, por lo que esto sugiere baja inversión real — un hallazgo relevante, no un vacío de datos.`;
  }

  return (
    <div
      className="p-3"
      style={{
        border: "0.5px solid rgb(10 37 64 / 0.25)",
        borderLeft: `4px solid ${accent}`,
        borderRadius: 4,
        background: subregistro ? "rgba(239,159,39,0.06)" : "rgba(10,37,64,0.03)",
      }}
    >
      <p className="gov-label mb-0.5" style={{ fontSize: 9, color: accent }}>
        {subregistro ? "Posible subregistro" : "Cero verificado"}
      </p>
      <p style={{ fontSize: 13, lineHeight: 1.5, color: "rgb(10 37 64)" }}>{texto}</p>
    </div>
  );
}

function MuniHead({
  dato,
  loading,
}: {
  dato: MunicipioComparable | null;
  loading: boolean;
}) {
  return (
    <div className="text-center px-2 py-3">
      {loading || !dato ? (
        <span className="gov-mono" style={{ fontSize: 12, color: "rgb(200 211 222)" }}>
          …
        </span>
      ) : (
        <>
          <p style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.15 }}>{dato.nombre}</p>
          <p className="gov-label" style={{ fontSize: 9, color: "rgb(200 211 222)" }}>
            {dato.departamento}
          </p>
        </>
      )}
    </div>
  );
}
