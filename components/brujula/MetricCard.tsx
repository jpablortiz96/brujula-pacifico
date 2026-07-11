const VARIANT_COLORS: Record<string, string> = {
  azul:     "rgb(10 37 64)",
  amarillo: "rgb(255 205 0)",
  verde:    "rgb(26 135 84)",
  rojo:     "rgb(206 17 38)",
};

interface Props {
  label: string;
  value: string | number;
  sublabel?: string;
  variant?: "azul" | "amarillo" | "verde" | "rojo";
  loading?: boolean;
}

export default function MetricCard({
  label,
  value,
  sublabel,
  variant = "azul",
  loading = false,
}: Props) {
  const accent = VARIANT_COLORS[variant];

  return (
    <div
      className="bg-white p-4 transition-all"
      style={{
        border: "0.5px solid rgb(10 37 64)",
        borderLeft: `4px solid ${accent}`,
        borderRadius: 4,
      }}
    >
      <p className="gov-label text-gov-muted" style={{ fontSize: 11 }}>
        {label}
      </p>

      {loading ? (
        <div className="mt-2 space-y-2 animate-pulse">
          <div className="h-7 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
        </div>
      ) : (
        <>
          <p
            className="mt-1 tabular-nums text-gov-azul"
            style={{ fontSize: 28, fontWeight: 500, lineHeight: 1.2 }}
          >
            {value}
          </p>
          {sublabel && (
            <p className="text-gov-muted mt-0.5" style={{ fontSize: 12 }}>
              {sublabel}
            </p>
          )}
        </>
      )}
    </div>
  );
}
