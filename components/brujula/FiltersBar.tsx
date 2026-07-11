"use client";

import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import type { DashboardFilters } from "@/types/brujula";

const DEPTOS = ["Cauca", "Chocó", "Nariño", "Valle del Cauca"];

interface Props {
  onFiltersChange: (f: DashboardFilters) => void;
}

export default function FiltersBar({ onFiltersChange }: Props) {
  const [departamento, setDepartamento] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [debouncedBusqueda, setDebouncedBusqueda] = useState("");

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedBusqueda(busqueda), 400);
    return () => clearTimeout(t);
  }, [busqueda]);

  // Emit on every filter change
  useEffect(() => {
    onFiltersChange({
      departamento:  departamento  || null,
      fechaInicio:   fechaInicio   || null,
      fechaFin:      fechaFin      || null,
      busqueda:      debouncedBusqueda || null,
    });
  }, [departamento, fechaInicio, fechaFin, debouncedBusqueda, onFiltersChange]);

  const hasFilters =
    !!departamento || !!fechaInicio || !!fechaFin || !!busqueda;

  function clear() {
    setDepartamento("");
    setFechaInicio("");
    setFechaFin("");
    setBusqueda("");
    setDebouncedBusqueda("");
  }

  const inputClass =
    "w-full border border-gov-azul bg-white text-gov-azul text-sm px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-gov-azul";
  const selectClass =
    "w-full border border-gov-azul bg-white text-gov-azul text-sm px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-gov-azul appearance-none";

  return (
    <div
      className="bg-gov-bone px-4 py-4"
      style={{
        borderBottom: "1px solid rgba(10,37,64,0.2)",
        borderRadius: 4,
      }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Departamento */}
        <div>
          <label className="gov-label text-gov-muted block mb-1" style={{ fontSize: 10 }}>
            Departamento
          </label>
          <select
            value={departamento}
            onChange={(e) => setDepartamento(e.target.value)}
            className={selectClass}
            style={{ borderRadius: 2 }}
          >
            <option value="">Todos</option>
            {DEPTOS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* Fecha inicio */}
        <div>
          <label className="gov-label text-gov-muted block mb-1" style={{ fontSize: 10 }}>
            Desde
          </label>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className={inputClass}
            style={{ borderRadius: 2 }}
          />
        </div>

        {/* Fecha fin */}
        <div>
          <label className="gov-label text-gov-muted block mb-1" style={{ fontSize: 10 }}>
            Hasta
          </label>
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className={inputClass}
            style={{ borderRadius: 2 }}
          />
        </div>

        {/* Búsqueda */}
        <div>
          <label className="gov-label text-gov-muted block mb-1" style={{ fontSize: 10 }}>
            Búsqueda
          </label>
          <div className="relative">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gov-muted pointer-events-none"
            />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Entidad, objeto, proveedor…"
              className={inputClass}
              style={{ paddingLeft: 28, borderRadius: 2 }}
            />
          </div>
        </div>
      </div>

      {hasFilters && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={clear}
            className="flex items-center gap-1.5 text-sm text-gov-muted border border-gov-muted px-3 py-1 hover:bg-white transition-colors"
            style={{ borderRadius: 2 }}
          >
            <X size={13} />
            Limpiar filtros
          </button>
        </div>
      )}
    </div>
  );
}
