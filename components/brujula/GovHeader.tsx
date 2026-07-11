"use client";

import { Menu } from "lucide-react";
import { useRol } from "@/lib/context/RolContext";
import { useSidebar } from "@/lib/context/SidebarContext";

export default function GovHeader() {
  const { rol: role, setRol: setRole } = useRol();
  const { toggle } = useSidebar();

  return (
    <header className="bg-white sticky top-0 z-30">
      {/* Top band (se encoge en móvil) */}
      <div className="bg-gov-azuldeep px-4 sm:px-6 flex items-center gap-3 py-1.5">
        <div className="flex flex-col flex-shrink-0" style={{ width: 14, height: 20 }}>
          <div className="flex-1 bg-gov-amarillo" />
          <div className="flex-1 bg-gov-azul" />
          <div className="flex-1 bg-gov-rojo" />
        </div>
        <span className="gov-mono gov-label text-white truncate" style={{ fontSize: 11 }}>
          BRÚJULA · datos.gov.co · MinTIC
        </span>
      </div>

      {/* Main band */}
      <div
        className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3 border-b-2 border-gov-azul"
        style={{ background: "#fff" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {/* Hamburguesa (solo móvil/tablet) */}
          <button
            type="button"
            onClick={toggle}
            aria-label="Abrir menú"
            className="lg:hidden flex items-center justify-center flex-shrink-0"
            style={{ width: 40, height: 40, border: "2px solid rgb(10 37 64)", borderRadius: 4, color: "rgb(10 37 64)" }}
          >
            <Menu size={20} />
          </button>

          <div className="min-w-0">
            <div className="text-gov-azul tracking-tight" style={{ fontWeight: 500, fontSize: 20 }}>
              BRÚJULA
            </div>
            <div className="gov-label text-gov-muted truncate hidden sm:block" style={{ fontSize: 12 }}>
              Sistema operativo de inteligencia territorial
            </div>
          </div>
        </div>

        {/* Toggle rol */}
        <div className="flex border-2 border-gov-azul overflow-hidden flex-shrink-0" style={{ borderRadius: 4 }}>
          <button
            type="button"
            onClick={() => setRole("funcionario")}
            className="px-2.5 sm:px-4 py-1.5 text-xs sm:text-sm font-medium transition-colors"
            style={{
              background: role === "funcionario" ? "rgb(10 37 64)" : "#fff",
              color: role === "funcionario" ? "#fff" : "rgb(10 37 64)",
            }}
          >
            Funcionario
          </button>
          <button
            type="button"
            onClick={() => setRole("ciudadano")}
            className="px-2.5 sm:px-4 py-1.5 text-xs sm:text-sm font-medium transition-colors"
            style={{
              background: role === "ciudadano" ? "rgb(10 37 64)" : "#fff",
              color: role === "ciudadano" ? "#fff" : "rgb(10 37 64)",
            }}
          >
            Ciudadano
          </button>
        </div>
      </div>

      {/* Yellow stripe */}
      <div className="h-1 bg-gov-amarillo" />
    </header>
  );
}
