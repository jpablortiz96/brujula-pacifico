"use client";

import { useEffect, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";

const KEY = "brujula_last_sync";
const FECHA = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default function ConnectionBanner() {
  const [online, setOnline] = useState(true);
  const [reconectado, setReconectado] = useState(false);
  const [ultimaSync, setUltimaSync] = useState<string | null>(null);

  useEffect(() => {
    const marcarSync = () => {
      const now = new Date().toISOString();
      try {
        localStorage.setItem(KEY, now);
      } catch {
        /* almacenamiento no disponible */
      }
      setUltimaSync(now);
    };

    const irOnline = () => {
      setOnline(true);
      setReconectado(true);
      marcarSync();
      setTimeout(() => setReconectado(false), 3000);
    };
    const irOffline = () => setOnline(false);

    // Estado inicial (sincroniza con el navegador al montar). Se encapsula
    // en una función: es una lectura única del estado del navegador (online
    // + última sync guardada), no un setState de render.
    const inicializar = () => {
      setOnline(navigator.onLine);
      setUltimaSync(localStorage.getItem(KEY));
      if (navigator.onLine) marcarSync();
    };
    inicializar();

    window.addEventListener("online", irOnline);
    window.addEventListener("offline", irOffline);
    return () => {
      window.removeEventListener("online", irOnline);
      window.removeEventListener("offline", irOffline);
    };
  }, []);

  if (online && !reconectado) return null;

  if (!online) {
    return (
      <div
        className="w-full flex items-center gap-2 px-4 py-2"
        style={{ background: "rgb(239 159 39)", color: "rgb(10 37 64)" }}
      >
        <WifiOff size={15} className="flex-shrink-0" />
        <span style={{ fontSize: 12.5, fontWeight: 500 }}>
          Sin conexión — mostrando datos guardados.
          {ultimaSync ? ` Última sincronización: ${FECHA.format(new Date(ultimaSync))}.` : ""}
        </span>
      </div>
    );
  }

  // Reconectado (transitorio 3s)
  return (
    <div
      className="w-full flex items-center gap-2 px-4 py-2"
      style={{ background: "rgb(26 135 84)", color: "#fff" }}
    >
      <Wifi size={15} className="flex-shrink-0" />
      <span style={{ fontSize: 12.5, fontWeight: 500 }}>Conexión restablecida.</span>
    </div>
  );
}
