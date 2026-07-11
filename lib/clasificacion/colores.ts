import type { Sector } from "./sectores";

// Paleta sobria compatible con brutal-gov (azules, verdes, ámbar, terracota,
// gris). Nada fluorescente.
export const COLOR_SECTOR: Record<string, string> = {
  "Educación": "#0A2540", // gov-azul
  "Salud": "#1A8754", // gov-verde
  "Seguridad y justicia": "#CE1126", // gov-rojo
  "Agua y saneamiento": "#2B7A9B", // azul agua
  "Vías e infraestructura": "#5C6B7A", // gris pizarra
  "Agricultura y desarrollo rural": "#6B8E23", // verde oliva
  "Ambiente y gestión del riesgo": "#3E7C4F", // verde bosque
  "Cultura, deporte y turismo": "#B5651D", // terracota
  "Vivienda": "#8A6D3B", // ocre
  "Empleo y desarrollo económico": "#4A6FA5", // azul acero
  "Administración y servicios generales": "#9AA5B1", // gris claro
  "Otro": "#C7CDD4",
  "Sin clasificar": "#E1E5EA",
};

export function colorSector(sector: string): string {
  return COLOR_SECTOR[sector] ?? COLOR_SECTOR["Otro"];
}

export type { Sector };
