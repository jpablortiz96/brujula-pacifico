"use client";

import { get, set, del, keys } from "idb-keyval";
import type { PaqueteTerritorial } from "@/app/api/paquete/route";

const PREFIX = "paquete:";
const key = (divipola: string) => `${PREFIX}${divipola}`;

export type { PaqueteTerritorial };

/** Descarga el paquete de un municipio y lo guarda en IndexedDB. */
export async function descargarPaquete(
  divipola: string
): Promise<{ paquete: PaqueteTerritorial; bytes: number }> {
  const res = await fetch(`/api/paquete?divipola=${encodeURIComponent(divipola)}`);
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.detalle || j.error || `HTTP ${res.status}`);
  }
  const paquete = (await res.json()) as PaqueteTerritorial;
  await set(key(divipola), paquete);
  const bytes = new Blob([JSON.stringify(paquete)]).size;
  return { paquete, bytes };
}

export async function leerPaquete(
  divipola: string
): Promise<PaqueteTerritorial | undefined> {
  return get<PaqueteTerritorial>(key(divipola));
}

export async function eliminarPaquete(divipola: string): Promise<void> {
  await del(key(divipola));
}

/** Lista los divipolas de los paquetes guardados. */
export async function paquetesDescargados(): Promise<string[]> {
  const all = await keys();
  return all
    .filter((k): k is string => typeof k === "string" && k.startsWith(PREFIX))
    .map((k) => k.slice(PREFIX.length));
}

/** Lee todos los paquetes guardados (para la vista offline). */
export async function todosLosPaquetes(): Promise<PaqueteTerritorial[]> {
  const divipolas = await paquetesDescargados();
  const paquetes = await Promise.all(divipolas.map((d) => leerPaquete(d)));
  return paquetes.filter((p): p is PaqueteTerritorial => p != null);
}
