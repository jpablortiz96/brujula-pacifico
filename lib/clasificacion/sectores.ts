// ─────────────────────────────────────────────────────────────────────────
// BRÚJULA · Clasificación sectorial de contratos SECOP (por keywords)
// La clasificación es APROXIMADA — se declara en la UI y en el agente.
// ─────────────────────────────────────────────────────────────────────────

export const SECTORES = [
  "Educación",
  "Salud",
  "Seguridad y justicia",
  "Agua y saneamiento",
  "Vías e infraestructura",
  "Agricultura y desarrollo rural",
  "Ambiente y gestión del riesgo",
  "Cultura, deporte y turismo",
  "Vivienda",
  "Empleo y desarrollo económico",
  "Administración y servicios generales",
  "Otro",
] as const;

export type Sector = (typeof SECTORES)[number];

const ADMIN: Sector = "Administración y servicios generales";
const OTRO: Sector = "Otro";

export function normalizar(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita diacríticos
    .replace(/\s+/g, " ")
    .trim();
}

// Keywords normalizadas (sin tildes) por sector.
const KEYWORDS: Record<Sector, string[]> = {
  "Educación": [
    "colegio", "escuela", "docente", "estudiantil", "matricula", "pae",
    "alimentacion escolar", "institucion educativa", "aula", "pedagogic",
    "biblioteca escolar", "transporte escolar", "kit escolar", "sede educativa",
    "educacion", "educativ", "estudiante", "preescolar", "universitar", "beca",
    "restaurante escolar", "mobiliario escolar", "utiles escolares", "internado escolar",
    "diploma", "grado escolar",
  ],
  "Salud": [
    "hospital", "e.s.e", "ese ", "ips ", "salud", "medic", "enfermer",
    "vacun", "ambulancia", "odontolog", "psicolog", "nutricion", "epidemiolog",
    "farmac", "laboratorio clinico", "atencion en salud", "urgencias",
    "insumos medicos", "material osteosintesis", "citolog", "hospitalari",
    "medicamento", "imagenolog", "radiolog", "discapacidad", "clinica",
  ],
  "Seguridad y justicia": [
    "policia", "policial", "penitenciari", "carcel", "seguridad ciudadana",
    "camara de vigilancia", "convivencia ciudadana", "justicia", "comisaria de familia",
    "derechos humanos", "victimas del conflicto", "inspeccion de policia",
    "orden publico", "fuerza publica", "militar", "cuadrante", "gestor de convivencia",
  ],
  "Agua y saneamiento": [
    "acueducto", "alcantarillado", "agua potable", "saneamiento",
    "residuos solidos", "aseo", "relleno sanitario", "pozo", "letrina",
    "planta de tratamiento", "ptap", "ptar", "agua",
  ],
  "Vías e infraestructura": [
    "via ", "vias", "pavimento", "puente", "carretera", "placa huella",
    "mantenimiento vial", "senalizacion", "alumbrado", "infraestructura vial",
    "obra civil", "construccion de obra", "interventoria de obra", "andenes",
    "mejoramiento de via", "mantenimiento de vias", "malla vial", "parque publico",
  ],
  "Agricultura y desarrollo rural": [
    "agricola", "campesin", "cultivo", "ganader", "pesca", "acuicultura",
    "asistencia tecnica rural", "semilla", "riego", "distrito de riego",
    "agropecuar", "rural", "umata",
  ],
  "Ambiente y gestión del riesgo": [
    "ambiental", "reforestacion", "conservacion ambiental", "biodiversidad",
    "cuenca", "forestal", "cambio climatico", "gestion del riesgo", "desastre",
    "bomberos", "emergencia",
  ],
  "Cultura, deporte y turismo": [
    "cultura", "deporte", "turismo", "recreacion", "patrimonio", "artistic",
    "festival", "banda musical", "escenario deportivo", "polideportivo",
    "biblioteca publica", "danza",
  ],
  "Vivienda": [
    "vivienda", "mejoramiento de vivienda", "urbanizacion", "titulacion",
    "subsidio de vivienda",
  ],
  "Empleo y desarrollo económico": [
    "empleo", "emprendimiento", "productiv", "capacitacion laboral", "mipyme",
    "microempresa", "desarrollo economico", "empresarial",
  ],
  "Administración y servicios generales": [
    "prestacion de servicios de apoyo a la gestion",
    "prestacion de servicios profesionales", "papeleria", "aseo y cafeteria",
    "arrendamiento", "vigilancia de sede", "software", "licencia de software",
    "mantenimiento de equipos", "suministro de combustible", "publicidad",
    "seguros", "transporte de funcionarios", "apoyo a la gestion",
    "mobiliario", "muebles de oficina", "equipo de computo", "computador",
    "impresora", "toner", "fotocopiad", "combustible", "honorarios",
    "elementos de aseo", "dotacion de personal", "utiles de oficina",
  ],
  "Otro": [],
};

// Sectores "específicos" (todos menos Administración y Otro): tienen
// prioridad para no dejar que Administración absorba todo.
const ESPECIFICOS = SECTORES.filter((s) => s !== ADMIN && s !== OTRO);

function contar(objetoNorm: string, sector: Sector): number {
  let n = 0;
  for (const kw of KEYWORDS[sector]) if (objetoNorm.includes(kw)) n++;
  return n;
}

export function clasificarPorKeywords(
  objeto: string
): { sector: Sector; confianza: "alta" | "media" } | null {
  const norm = normalizar(objeto);
  if (!norm) return null;

  // 1. Sectores específicos primero.
  const hits = ESPECIFICOS.map((s) => ({ s, n: contar(norm, s) })).filter(
    (x) => x.n > 0
  );
  hits.sort((a, b) => b.n - a.n);

  if (hits.length > 0) {
    const top = hits[0];
    const empate = hits.length > 1 && hits[1].n === top.n;
    if (empate) return null; // ambigüedad → LLM
    return { sector: top.s, confianza: top.n >= 2 ? "alta" : "media" };
  }

  // 2. Administración solo si ningún sector específico coincidió.
  const admin = contar(norm, ADMIN);
  if (admin > 0) return { sector: ADMIN, confianza: admin >= 2 ? "alta" : "media" };

  // 3. Nada → al LLM.
  return null;
}
