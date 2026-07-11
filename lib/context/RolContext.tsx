"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type Rol = "funcionario" | "ciudadano";

interface RolCtx {
  rol: Rol;
  setRol: (r: Rol) => void;
}

const COOKIE = "brujula_rol";

const Context = createContext<RolCtx | null>(null);

function leerCookie(): Rol | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${COOKIE}=`));
  const val = match?.split("=")[1];
  return val === "ciudadano" || val === "funcionario" ? val : null;
}

export function RolProvider({ children }: { children: React.ReactNode }) {
  const [rol, setRolState] = useState<Rol>("funcionario");

  // Lee la cookie al montar (evita mismatch de hidratación: el server
  // siempre renderiza "funcionario" y el cliente ajusta tras montar).
  // El setState en el efecto es intencional: sincroniza una vez con el
  // estado del navegador (cookie) que no existe en SSR.
  useEffect(() => {
    const guardado = leerCookie();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (guardado && guardado !== "funcionario") setRolState(guardado);
  }, []);

  const setRol = useCallback((r: Rol) => {
    setRolState(r);
    document.cookie = `${COOKIE}=${r}; path=/; max-age=31536000; samesite=lax`;
  }, []);

  return <Context.Provider value={{ rol, setRol }}>{children}</Context.Provider>;
}

export function useRol(): RolCtx {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useRol debe usarse dentro de <RolProvider>");
  return ctx;
}
