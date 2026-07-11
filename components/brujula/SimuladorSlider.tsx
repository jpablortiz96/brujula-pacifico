"use client";

interface Props {
  inversionActual: number;
  inversionPares: number;
  poblacion: number;
  value: number;
  onChange: (v: number) => void;
}

const COP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export default function SimuladorSlider({
  inversionActual,
  inversionPares,
  value,
  onChange,
}: Props) {
  // Tope razonable: 2.5× la mayor referencia (actual o pares), con piso,
  // para poder explorar por encima y por debajo de ambas marcas.
  const max = Math.max(
    Math.round(Math.max(inversionActual, inversionPares, 1) * 2.5),
    10_000_000
  );
  const step = Math.max(Math.round(max / 200), 1);

  const pct = (v: number) => `${Math.min(100, Math.max(0, (v / max) * 100))}%`;

  return (
    <div>
      {/* Valor grande en vivo */}
      <div className="text-center mb-3">
        <p className="gov-label text-gov-muted" style={{ fontSize: 10 }}>
          Inversión pública simulada
        </p>
        <p
          className="tabular-nums text-gov-azul"
          style={{ fontSize: 34, fontWeight: 600, lineHeight: 1.1 }}
        >
          {COP.format(Math.round(value))}
        </p>
      </div>

      {/* Slider (controlado; el padre recalcula al instante) */}
      <input
        type="range"
        min={0}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        style={{ accentColor: "rgb(10 37 64)" }}
      />

      {/* Marcas de referencia */}
      <div className="relative mt-1" style={{ height: 28 }}>
        <Marca posicion={pct(inversionActual)} color="rgb(92 107 122)" label="actual" />
        {inversionPares > 0 && (
          <Marca posicion={pct(inversionPares)} color="rgb(26 135 84)" label="pares" />
        )}
      </div>
    </div>
  );
}

function Marca({
  posicion,
  color,
  label,
}: {
  posicion: string;
  color: string;
  label: string;
}) {
  return (
    <div
      className="absolute flex flex-col items-center"
      style={{ left: posicion, transform: "translateX(-50%)", top: 0 }}
    >
      <div style={{ width: 2, height: 8, background: color }} />
      <span className="gov-label" style={{ fontSize: 9, color }}>
        {label}
      </span>
    </div>
  );
}
