export const DEPTOS_PACIFICO = {
  CAUCA: { codigo: "19", nombre: "Cauca" },
  CHOCO: { codigo: "27", nombre: "Chocó" },
  NARINO: { codigo: "52", nombre: "Nariño" },
  VALLE: { codigo: "76", nombre: "Valle del Cauca" },
} as const;

export type DeptoKey = keyof typeof DEPTOS_PACIFICO;

export const CODIGOS_PACIFICO = ["19", "27", "52", "76"] as const;

export const NOMBRES_PACIFICO = [
  "Cauca",
  "Chocó",
  "Choco",
  "Nariño",
  "Narino",
  "Valle",
  "Valle del Cauca",
] as const;

export const MUNICIPIOS_FOCO = [
  { divipola: "52835", nombre: "Tumaco",        depto: "Nariño",           lat: 1.8138,  lng: -78.7631 },
  { divipola: "76109", nombre: "Buenaventura",  depto: "Valle del Cauca",  lat: 3.8832,  lng: -77.0311 },
  { divipola: "27001", nombre: "Quibdó",         depto: "Chocó",            lat: 5.6919,  lng: -76.6583 },
  { divipola: "19001", nombre: "Popayán",        depto: "Cauca",            lat: 2.4419,  lng: -76.6061 },
  { divipola: "19256", nombre: "El Tambo",       depto: "Cauca",            lat: 2.4589,  lng: -76.8163 },
  { divipola: "27006", nombre: "Acandí",         depto: "Chocó",            lat: 8.5125,  lng: -77.2825 },
  { divipola: "52001", nombre: "Pasto",          depto: "Nariño",           lat: 1.2136,  lng: -77.2811 },
  { divipola: "76001", nombre: "Cali",           depto: "Valle del Cauca",  lat: 3.4516,  lng: -76.5319 },
  { divipola: "27245", nombre: "Condoto",        depto: "Chocó",            lat: 5.0983,  lng: -76.6519 },
  { divipola: "52254", nombre: "El Charco",      depto: "Nariño",           lat: 2.4806,  lng: -78.1100 },
  { divipola: "19300", nombre: "Guapi",          depto: "Cauca",            lat: 2.5667,  lng: -77.8833 },
  { divipola: "76243", nombre: "El Dovio",       depto: "Valle del Cauca",  lat: 4.5178,  lng: -76.2408 },
] as const;

export function esDeptoPacifico(codigo: string): boolean {
  return (CODIGOS_PACIFICO as readonly string[]).includes(codigo);
}

export function codigoTieneDeptoP(divipola: string): boolean {
  return CODIGOS_PACIFICO.some((c) => divipola.startsWith(c));
}
