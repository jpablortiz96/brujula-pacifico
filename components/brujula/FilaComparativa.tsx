"use client";

export type FormatoComparativo = "moneda" | "numero" | "porcentaje";
export type MejorEs = "mayor" | "menor" | "neutro";

interface Props {
  label: string;
  valorA: number | null;
  valorB: number | null;
  formato: FormatoComparativo;
  mejorEs: MejorEs;
  nombreA: string;
  nombreB: string;
}

const COP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});
const NUM = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });

function fmt(v: number | null, formato: FormatoComparativo): string {
  if (v == null) return "—";
  if (formato === "moneda") return COP.format(Math.round(v));
  if (formato === "porcentaje") return `${v}%`;
  return NUM.format(Math.round(v));
}

/** Múltiplo legible: 1.3×, 4×, 88×. */
function mult(a: number, b: number): string {
  const m = Math.max(a, b) / Math.min(a, b);
  return m < 10 ? `${Math.round(m * 10) / 10}×` : `${Math.round(m)}×`;
}

export default function FilaComparativa({
  label,
  valorA,
  valorB,
  formato,
  mejorEs,
  nombreA,
  nombreB,
}: Props) {
  // ── ¿Qué lado está mejor? ('a' | 'b' | null) ────────────────────────────
  let mejor: "a" | "b" | null = null;
  if (mejorEs !== "neutro" && valorA != null && valorB != null && valorA !== valorB) {
    const aGana = mejorEs === "mayor" ? valorA > valorB : valorA < valorB;
    mejor = aGana ? "a" : "b";
  }

  // ── Texto de brecha ─────────────────────────────────────────────────────
  let brecha = "";
  if (valorA == null && valorB == null) {
    brecha = "Sin datos en ninguno";
  } else if (valorA == null || valorB == null) {
    const conDato = valorA != null ? nombreA : nombreB;
    brecha = `Solo ${conDato} tiene registro`;
  } else if (valorA === valorB) {
    brecha = "Iguales";
  } else if (formato === "porcentaje") {
    const diff = Math.round(Math.abs(valorA - valorB) * 10) / 10;
    const mayor = valorA > valorB ? nombreA : nombreB;
    brecha = `${mayor} +${diff} puntos`;
  } else {
    const mayorNombre = valorA > valorB ? nombreA : nombreB;
    const menor = Math.min(valorA, valorB);
    if (menor === 0) {
      brecha = `${mayorNombre} concentra todo (el otro registra 0)`;
    } else {
      brecha = `${mayorNombre} tiene ${mult(valorA, valorB)} más`;
    }
  }

  const cellStyle = (side: "a" | "b"): React.CSSProperties => {
    if (mejor == null) return {};
    const esMejor = mejor === side;
    return {
      background: esMejor ? "rgba(26,135,84,0.10)" : "rgba(206,17,38,0.06)",
      color: esMejor ? "rgb(20 110 68)" : "rgb(160 20 35)",
      fontWeight: 700,
    };
  };

  return (
    <div
      className="grid items-stretch"
      style={{
        gridTemplateColumns: "1fr 1.4fr 1fr",
        borderBottom: "0.5px solid rgb(10 37 64 / 0.12)",
      }}
    >
      {/* Valor A */}
      <div
        className="flex items-center justify-center tabular-nums px-2 py-3 text-center"
        style={{ fontSize: 16, ...cellStyle("a") }}
      >
        {fmt(valorA, formato)}
      </div>

      {/* Etiqueta + brecha */}
      <div className="flex flex-col items-center justify-center px-2 py-2 text-center">
        <span className="gov-label text-gov-azul" style={{ fontSize: 10.5 }}>
          {label}
        </span>
        <span className="text-gov-muted mt-0.5" style={{ fontSize: 10.5, lineHeight: 1.3 }}>
          {brecha}
        </span>
      </div>

      {/* Valor B */}
      <div
        className="flex items-center justify-center tabular-nums px-2 py-3 text-center"
        style={{ fontSize: 16, ...cellStyle("b") }}
      >
        {fmt(valorB, formato)}
      </div>
    </div>
  );
}
