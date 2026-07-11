"use client";

import { createContext, useCallback, useContext, useState } from "react";

interface SidebarCtx {
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
}

const Context = createContext<SidebarCtx | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((o) => !o), []);
  return <Context.Provider value={{ open, setOpen, toggle }}>{children}</Context.Provider>;
}

export function useSidebar(): SidebarCtx {
  const ctx = useContext(Context);
  // Fallback no-op si algún componente se usa fuera del provider (p. ej. landing).
  if (!ctx) return { open: false, setOpen: () => {}, toggle: () => {} };
  return ctx;
}
