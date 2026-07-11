"use client";

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { ExternalLink, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import type { ContratoSecop } from "@/types/brujula";

const COP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

function formatFecha(f: string | null): string {
  if (!f) return "—";
  try {
    return format(parseISO(f), "dd MMM yyyy", { locale: es });
  } catch {
    return f;
  }
}

function EstadoBadge({ estado }: { estado: string | null }) {
  if (!estado) return <span className="text-gov-muted">—</span>;
  const e = estado.toLowerCase();
  const base: React.CSSProperties = {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 2,
    fontSize: 10,
    fontWeight: 500,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  };

  if (e.includes("ejecuci"))
    return (
      <span style={{ ...base, background: "rgb(255,205,0)", color: "rgb(5,20,36)" }}>
        {estado}
      </span>
    );
  if (e.includes("cerrado"))
    return (
      <span style={{ ...base, background: "rgb(92,107,122)", color: "#fff" }}>
        {estado}
      </span>
    );
  if (e.includes("liquidado"))
    return (
      <span style={{ ...base, background: "rgb(26,135,84)", color: "#fff" }}>
        {estado}
      </span>
    );
  return (
    <span
      style={{ ...base, background: "#fff", color: "rgb(92,107,122)", border: "1px solid rgb(92,107,122)" }}
    >
      {estado}
    </span>
  );
}

const helper = createColumnHelper<ContratoSecop>();

const columns = [
  helper.accessor("fecha_firma", {
    header: "Fecha firma",
    size: 100,
    cell: (i) => (
      <span className="text-sm tabular-nums">{formatFecha(i.getValue())}</span>
    ),
  }),
  helper.accessor("nombre_entidad", {
    header: "Entidad",
    size: 220,
    cell: (i) => (
      <span
        className="text-sm block truncate max-w-[220px]"
        title={i.getValue() ?? ""}
      >
        {i.getValue() ?? "—"}
      </span>
    ),
  }),
  helper.accessor("objeto_contrato", {
    header: "Objeto",
    size: 320,
    cell: (i) => (
      <span
        className="text-sm block"
        style={{
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          maxWidth: 320,
        }}
        title={i.getValue() ?? ""}
      >
        {i.getValue() ?? "—"}
      </span>
    ),
  }),
  helper.accessor("proveedor_adjudicado", {
    header: "Proveedor",
    size: 180,
    cell: (i) => (
      <span
        className="text-sm block truncate max-w-[180px]"
        title={i.getValue() ?? ""}
      >
        {i.getValue() ?? "—"}
      </span>
    ),
  }),
  helper.accessor("valor_contrato", {
    header: "Valor",
    size: 140,
    cell: (i) => {
      const v = i.getValue();
      return (
        <span className="text-sm tabular-nums text-right block">
          {v != null ? COP.format(v) : "—"}
        </span>
      );
    },
  }),
  helper.accessor("estado_contrato", {
    header: "Estado",
    size: 120,
    cell: (i) => <EstadoBadge estado={i.getValue()} />,
  }),
  helper.accessor("url_proceso", {
    header: "",
    size: 40,
    cell: (i) => {
      const url = i.getValue();
      if (!url) return null;
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gov-muted hover:text-gov-azul transition-colors"
          title="Ver proceso"
        >
          <ExternalLink size={14} />
        </a>
      );
    },
  }),
];

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          {columns.map((col, j) => (
            <td key={j} className="px-3 py-4" style={{ height: 64 }}>
              <div className="h-3 bg-gray-200 rounded" style={{ width: j === 2 ? "80%" : "60%" }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

interface Props {
  rows: ContratoSecop[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  onPageChange: (p: number) => void;
}

export default function TablaContratos({
  rows,
  total,
  page,
  pageSize,
  loading,
  onPageChange,
}: Props) {
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(total / pageSize),
  });

  const totalPages = Math.ceil(total / pageSize);
  const start = page * pageSize + 1;
  const end = Math.min(page * pageSize + pageSize, total);

  const btnClass =
    "border border-gov-azul text-gov-azul bg-white px-3 py-1 text-sm hover:bg-gov-bone transition-colors disabled:opacity-30 disabled:cursor-not-allowed";

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr
              className="bg-gov-bone"
              style={{ borderBottom: "2px solid rgb(10 37 64)" }}
            >
              {table.getFlatHeaders().map((header) => (
                <th
                  key={header.id}
                  className="px-3 py-2.5 text-left gov-label"
                  style={{
                    fontSize: 11,
                    width: header.getSize(),
                    whiteSpace: "nowrap",
                    textAlign:
                      header.id === "valor_contrato" ? "right" : "left",
                  }}
                >
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext()
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonRows />
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="text-center text-gov-muted py-16 text-sm"
                >
                  Sin contratos para los filtros aplicados
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-gov-bone transition-colors"
                  style={{
                    borderBottom: "0.5px solid rgba(10,37,64,0.12)",
                    height: 64,
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-3 py-2"
                      style={{
                        width: cell.column.getSize(),
                        textAlign:
                          cell.column.id === "valor_contrato"
                            ? "right"
                            : "left",
                        verticalAlign: "middle",
                      }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination footer */}
      {total > 0 && (
        <div
          className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between px-4 py-3 bg-gov-bone"
          style={{ borderTop: "1px solid rgba(10,37,64,0.12)" }}
        >
          <p className="text-gov-muted" style={{ fontSize: 12 }}>
            Mostrando {start}–{end} de{" "}
            {new Intl.NumberFormat("es-CO").format(total)} contratos
          </p>

          <div className="flex items-center gap-1">
            <button
              type="button"
              className={btnClass}
              onClick={() => onPageChange(0)}
              disabled={page === 0}
              style={{ borderRadius: 2 }}
            >
              <ChevronsLeft size={14} />
            </button>
            <button
              type="button"
              className={btnClass}
              onClick={() => onPageChange(page - 1)}
              disabled={page === 0}
              style={{ borderRadius: 2 }}
            >
              <ChevronLeft size={14} />
            </button>

            <span className="px-3 text-sm text-gov-muted tabular-nums">
              {page + 1} / {totalPages}
            </span>

            <button
              type="button"
              className={btnClass}
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages - 1}
              style={{ borderRadius: 2 }}
            >
              <ChevronRight size={14} />
            </button>
            <button
              type="button"
              className={btnClass}
              onClick={() => onPageChange(totalPages - 1)}
              disabled={page >= totalPages - 1}
              style={{ borderRadius: 2 }}
            >
              <ChevronsRight size={14} />
            </button>

            <div className="hidden sm:flex items-center gap-2 ml-3">
              <span className="text-gov-muted" style={{ fontSize: 12 }}>
                Ir a:
              </span>
              <input
                type="number"
                min={1}
                max={totalPages}
                defaultValue={page + 1}
                key={page}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const v = parseInt((e.target as HTMLInputElement).value, 10);
                    if (!isNaN(v) && v >= 1 && v <= totalPages) {
                      onPageChange(v - 1);
                    }
                  }
                }}
                className="border border-gov-azul text-gov-azul bg-white text-sm px-2 py-1 text-center w-14 focus:outline-none focus:ring-1 focus:ring-gov-azul"
                style={{ borderRadius: 2 }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
