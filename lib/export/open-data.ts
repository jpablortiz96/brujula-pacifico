// ─────────────────────────────────────────────────────────────────────────
// BRÚJULA · Exportador Open Data
// Convierte un análisis en (1) CSV de datos y (2) ficha de metadatos
// compatible con datos.gov.co — cierra el bucle del ecosistema de datos.
// ─────────────────────────────────────────────────────────────────────────

export interface DatasetMetadata {
  titulo: string;
  descripcion: string;
  fuente: string;
  licencia: string;
  fecha_generacion: string;
  autor: string;
  metodologia: string;
  fuentes_originales: { nombre: string; dataset_id: string; url: string }[];
  columnas: { nombre: string; tipo: string; descripcion: string }[];
  cobertura_geografica: string;
  cobertura_temporal: string;
}

export interface DatasetExport {
  filename: string;
  csv: string;
  metadata: DatasetMetadata;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toCSV(rows: Record<string, any>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const escape = (v: any) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(",")];
  for (const r of rows) lines.push(headers.map((h) => escape(r[h])).join(","));
  return "﻿" + lines.join("\n"); // BOM para Excel + tildes
}

const LINEA = "=".repeat(70);
const sublinea = "-".repeat(70);

/** Ficha de metadatos legible, estilo datos.gov.co (DCAT-like). */
export function metadataToText(m: DatasetMetadata): string {
  const out: string[] = [];
  out.push(LINEA);
  out.push("FICHA DE METADATOS · DATO ABIERTO");
  out.push("Generado por BRÚJULA — Inteligencia Territorial del Pacífico");
  out.push(LINEA);
  out.push("");
  out.push(`Título:        ${m.titulo}`);
  out.push(`Descripción:   ${m.descripcion}`);
  out.push(`Fuente:        ${m.fuente}`);
  out.push(`Autor:         ${m.autor}`);
  out.push(`Licencia:      ${m.licencia}`);
  out.push(`Generado:      ${m.fecha_generacion}`);
  out.push(`Cobertura geográfica: ${m.cobertura_geografica}`);
  out.push(`Cobertura temporal:   ${m.cobertura_temporal}`);
  out.push("");
  out.push(sublinea);
  out.push("METODOLOGÍA");
  out.push(sublinea);
  out.push(m.metodologia);
  out.push("");
  out.push(sublinea);
  out.push("DICCIONARIO DE COLUMNAS");
  out.push(sublinea);
  for (const c of m.columnas) {
    out.push(`• ${c.nombre} (${c.tipo})`);
    out.push(`    ${c.descripcion}`);
  }
  out.push("");
  out.push(sublinea);
  out.push("FUENTES ORIGINALES (datos.gov.co)");
  out.push(sublinea);
  for (const f of m.fuentes_originales) {
    out.push(`• ${f.nombre}`);
    out.push(`    Dataset ID: ${f.dataset_id}`);
    out.push(`    URL: ${f.url}`);
  }
  out.push("");
  out.push(LINEA);
  out.push(
    "Este archivo es un producto derivado, reutilizable bajo licencia abierta."
  );
  out.push(
    "Puede publicarse en datos.gov.co/usos como evidencia de reutilización"
  );
  out.push("de datos abiertos del Estado colombiano.");
  out.push(LINEA);
  return out.join("\n");
}

// Fuentes originales reutilizadas por los análisis de BRÚJULA.
export const FUENTES_ORIGINALES: DatasetMetadata["fuentes_originales"] = [
  { nombre: "SECOP II — Contratos", dataset_id: "jbjy-vk9h", url: "https://www.datos.gov.co/d/jbjy-vk9h" },
  { nombre: "Sisbén IV — DNP", dataset_id: "hq2v-5umk", url: "https://www.datos.gov.co/d/hq2v-5umk" },
  { nombre: "Establecimientos educativos — MEN", dataset_id: "cfw5-qzt5", url: "https://www.datos.gov.co/d/cfw5-qzt5" },
  { nombre: "Lesiones fatales — Medicina Legal", dataset_id: "2kpj-cktv", url: "https://www.datos.gov.co/d/2kpj-cktv" },
];

export const AUTOR = "BRÚJULA — Concurso Datos al Ecosistema 2026";
export const LICENCIA = "Creative Commons BY 4.0 (compatible con datos.gov.co)";
