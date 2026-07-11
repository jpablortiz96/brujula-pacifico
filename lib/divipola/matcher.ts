import { DIVIPOLA_PACIFICO_UNIQUE } from "./catalogo-pacifico";

/** Normaliza: minúsculas, sin tildes, sin puntos/comas, espacios colapsados */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")   // quita diacríticos (tildes)
    .replace(/[^a-z0-9\s]/g, " ")      // reemplaza puntos, comas, etc. por espacio
    .replace(/\s+/g, " ")              // colapsa espacios
    .trim();
}

// Mapa normalizado → divipola (construido una sola vez)
const INDEX = new Map<string, string>();
for (const m of DIVIPOLA_PACIFICO_UNIQUE) {
  INDEX.set(normalize(m.nombre), m.divipola);
}

// Mapa de aliases frecuentes en SECOP (nombre SECOP → nombre catálogo)
const ALIASES: Record<string, string> = {
  "buenaventura":               "Buenaventura",
  "cali":                       "Cali",
  "quibdo":                     "Quibdó",
  "quibdó":                     "Quibdó",
  "pasto":                      "Pasto",
  "popayan":                    "Popayán",
  "tumaco":                     "Tumaco",
  "palmira":                    "Palmira",
  "tulua":                      "Tuluá",
  "buga":                       "Guadalajara de Buga",
  "guadalajara de buga":        "Guadalajara de Buga",
  "cartago":                    "Cartago",
  "yumbo":                      "Yumbo",
  "jamundi":                    "Jamundí",
  "florida":                    "Florida",
  "pradera":                    "Pradera",
  "el cerrito":                 "El Cerrito",
  "candelaria":                 "Candelaria",
  "sevilla":                    "Sevilla",
  "ipiales":                    "Ipiales",
  "la union narino":            "La Unión",
  "la union valle":             "La Unión",
  "cumbal":                     "Cumbal",
  "samaniego":                  "Samaniego",
  "taminango":                  "Taminango",
  "barbacoas":                  "Barbacoas",
  "roberto payan":              "Roberto Payán",
  "olaya herrera":              "Olaya Herrera",
  "el charco":                  "El Charco",
  "la tola":                    "La Tola",
  "mosquera narino":            "Mosquera",
  "guapi":                      "Guapi",
  "lopez de micay":             "López de Micay",
  "timbiqui":                   "Timbiquí",
  "istmina":                    "Istmina",
  "condoto":                    "Condoto",
  "bahia solano":               "Bahía Solano",
  "nuqui":                      "Nuquí",
  "riosucio choco":             "Riosucio",
  "santander de quilichao":     "Santander de Quilichao",
  "puerto tejada":              "Puerto Tejada",
  "miranda cauca":              "Miranda",
  "patia":                      "Patía",
  "el patia":                   "Patía",
  "piendamo":                   "Piendamó",
  "no definido":                "",
  "sin definir":                "",
  "nd":                         "",
};

/**
 * Busca el DIVIPOLA de un municipio dado su nombre (de SECOP) y departamento.
 * Estrategia:
 *   1. Alias explícito
 *   2. Match exacto normalizado (dentro del depto)
 *   3. Match parcial: uno contiene al otro (startsWith en ambos sentidos)
 *   4. Match sin restricción de depto como último recurso
 */
export function findDivipola(
  ciudad: string | null | undefined,
  departamento: string | null | undefined
): string | null {
  if (!ciudad) return null;

  const cityNorm = normalize(ciudad);
  if (!cityNorm) return null;

  // Alias rápido
  const aliasName = ALIASES[cityNorm];
  if (aliasName === "") return null;              // alias explícito a "sin municipio"
  if (aliasName) {
    const aliasNorm = normalize(aliasName);
    if (INDEX.has(aliasNorm)) return INDEX.get(aliasNorm)!;
  }

  const deptoNorm = departamento ? normalize(departamento) : null;

  // Candidatos del mismo departamento
  const candidates = DIVIPOLA_PACIFICO_UNIQUE.filter((m) => {
    if (!deptoNorm) return true;
    return normalize(m.depto).includes(deptoNorm) || deptoNorm.includes(normalize(m.depto));
  });

  // 1. Match exacto dentro del departamento
  for (const m of candidates) {
    if (normalize(m.nombre) === cityNorm) return m.divipola;
  }

  // 2. Match parcial dentro del departamento
  for (const m of candidates) {
    const mn = normalize(m.nombre);
    if (mn.startsWith(cityNorm) || cityNorm.startsWith(mn)) return m.divipola;
  }

  // 3. Match exacto sin filtro de departamento
  const globalExact = INDEX.get(cityNorm);
  if (globalExact) return globalExact;

  // 4. Match parcial global
  for (const m of DIVIPOLA_PACIFICO_UNIQUE) {
    const mn = normalize(m.nombre);
    if (mn.startsWith(cityNorm) || cityNorm.startsWith(mn)) return m.divipola;
  }

  return null;
}
