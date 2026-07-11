"use client";

import { useEffect } from "react";

/**
 * Registra el service worker. Solo en producción para no interferir con el
 * HMR de desarrollo (el SW cachearía módulos y rompería el hot reload).
 */
export default function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("[sw] registro falló:", err);
      });
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}
