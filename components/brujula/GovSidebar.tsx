"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Map,
  Sparkles,
  AlertTriangle,
  GitCompare,
  Sliders,
  Wallet,
  Radar,
  BookOpen,
  FileText,
  WifiOff,
  MessageCircle,
} from "lucide-react";
import { useSidebar } from "@/lib/context/SidebarContext";

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
}

const NAV: NavItem[] = [
  { icon: Map, label: "Mapa territorial", href: "/dashboard" },
  { icon: Sparkles, label: "Copiloto IA", href: "/agente" },
  { icon: AlertTriangle, label: "Detector de olvido", href: "/zonas-olvidadas" },
  { icon: GitCompare, label: "Comparador", href: "/comparador" },
  { icon: Sliders, label: "Simulador ¿y si…?", href: "/simulador" },
  { icon: Wallet, label: "¿En qué se gastó mi plata?", href: "/mi-plata" },
  { icon: Radar, label: "Radar sectorial", href: "/radar" },
  { icon: FileText, label: "Brief ejecutivo", href: "/brief" },
  { icon: BookOpen, label: "Bitácora", href: "/bitacora" },
  { icon: MessageCircle, label: "WhatsApp", href: "/whatsapp" },
  { icon: WifiOff, label: "Modo offline", href: "/offline" },
];

export default function GovSidebar() {
  const pathname = usePathname();
  const { open, setOpen } = useSidebar();

  return (
    <>
      {/* Overlay (solo móvil, cuando el drawer está abierto) */}
      {open && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r-2 border-gov-azul flex flex-col transition-transform duration-200 lg:static lg:z-auto lg:w-60 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Nav */}
        <div className="flex-1 overflow-y-auto pt-4">
          <p className="gov-label text-gov-muted px-4 mb-2" style={{ fontSize: 10 }}>
            MÓDULOS
          </p>

          {NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            return (
              <Link key={item.label} href={item.href} className="block" onClick={() => setOpen(false)}>
                <div
                  className="flex items-center gap-3 px-4 py-3 text-sm transition-colors cursor-pointer"
                  style={
                    active
                      ? {
                          borderLeft: "4px solid rgb(255 205 0)",
                          background: "rgb(244 242 236)",
                          fontWeight: 500,
                          color: "rgb(10 37 64)",
                        }
                      : {
                          borderLeft: "4px solid transparent",
                          color: "rgb(92 107 122)",
                        }
                  }
                  onMouseEnter={(e) => {
                    if (!active) (e.currentTarget as HTMLDivElement).style.background = "rgb(244 242 236)";
                  }}
                  onMouseLeave={(e) => {
                    if (!active) (e.currentTarget as HTMLDivElement).style.background = "";
                  }}
                >
                  <Icon size={16} className="flex-shrink-0" />
                  <span className="flex-1">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-4 py-4">
          <p className="gov-mono text-gov-muted mb-2" style={{ fontSize: 11 }}>
            4 datasets oficiales + catálogo en vivo
          </p>
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-gov-verde flex-shrink-0" style={{ width: 8, height: 8 }} />
            <span className="text-gov-muted" style={{ fontSize: 11 }}>
              En línea
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
