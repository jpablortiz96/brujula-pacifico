import Link from "next/link";
import {
  Map,
  Sparkles,
  AlertTriangle,
  Wallet,
  Radar,
  GitCompare,
  Sliders,
  MessageCircle,
  FileText,
  Building2,
  Users,
  Newspaper,
  ArrowRight,
  ExternalLink,
  Database,
  GitMerge,
  Megaphone,
  Compass,
} from "lucide-react";
import { getLandingStats } from "@/lib/queries/landing";

export const revalidate = 3600; // ISR: números frescos cada hora

const GITHUB = "https://github.com/jpablortiz96/brujula-pacifico";
const DATOS = "https://www.datos.gov.co";

const NUM = new Intl.NumberFormat("es-CO");
const fmtNum = (n: number) => NUM.format(n);
const fmtBillones = (n: number) => `$${(n / 1e12).toFixed(1).replace(".", ",")} billones`;
function fmtFecha(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

const MODULOS = [
  { icon: Map, nombre: "Mapa territorial", href: "/dashboard", desc: "Inversión pública georreferenciada en el Pacífico." },
  { icon: Sparkles, nombre: "Copiloto IA", href: "/agente", desc: "Pregunta en lenguaje natural. 9 herramientas sobre datos reales." },
  { icon: AlertTriangle, nombre: "Detector de olvido", href: "/zonas-olvidadas", desc: "Municipios desatendidos con rigor estadístico (fex DANE)." },
  { icon: Wallet, nombre: "¿En qué se gastó mi plata?", href: "/mi-plata", desc: "Desglose sectorial ciudadano de la contratación." },
  { icon: Radar, nombre: "Radar sectorial", href: "/radar", desc: "Inversión vs resultados en educación, seguridad y salud." },
  { icon: GitCompare, nombre: "Comparador", href: "/comparador", desc: "Dos municipios lado a lado, con la brecha resaltada." },
  { icon: Sliders, nombre: "Simulador ¿y si…?", href: "/simulador", desc: "Escenarios de inversión honestos, con supuestos declarados." },
  { icon: MessageCircle, nombre: "WhatsApp", href: "/whatsapp", desc: "Acceso sin computador para zonas rurales." },
  { icon: FileText, nombre: "Brief ejecutivo", href: "/brief", desc: "Documentos PDF oficiales con citaciones verificables." },
];

const ACTORES = [
  { icon: Building2, titulo: "Para alcaldes", desc: "Prioriza inversión con evidencia y compara tu municipio con sus pares." },
  { icon: Users, titulo: "Para líderes comunitarios", desc: "Descubre en qué se gastó la plata de tu territorio, sin tecnicismos." },
  { icon: Newspaper, titulo: "Para periodistas", desc: "Detecta zonas olvidadas y contrastes de inversión con datos verificables." },
];

const PASOS = [
  { icon: Database, titulo: "Ingesta", desc: "Descargamos y geolocalizamos datos abiertos vía la API Socrata de datos.gov.co." },
  { icon: GitMerge, titulo: "Cruce", desc: "Agentes de IA y clasificación sectorial cruzan las 4 fuentes por municipio." },
  { icon: Megaphone, titulo: "Acción", desc: "Zonas olvidadas, briefs PDF, exportación como dato abierto y simulación de inversión." },
];

const borde2 = { border: "2px solid rgb(10 37 64)", borderRadius: 4 } as const;
const borde05 = { border: "0.5px solid rgb(10 37 64)", borderRadius: 4 } as const;

export default async function Landing() {
  const s = await getLandingStats();

  const fuentes = [
    { label: "SECOP II — Contratos", entidad: "Colombia Compra Eficiente", id: "jbjy-vk9h", detalle: `${fmtNum(s.contratos)} contratos` },
    { label: "Sisbén IV", entidad: "DNP", id: "hq2v-5umk", detalle: `${fmtNum(s.sisben)} registros` },
    { label: "Establecimientos educativos", entidad: "Ministerio de Educación", id: "cfw5-qzt5", detalle: `${fmtNum(s.educacion)} sedes` },
    { label: "Lesiones fatales", entidad: "Medicina Legal", id: "2kpj-cktv", detalle: `${fmtNum(s.medicina)} registros` },
  ];

  const metricas = [
    { valor: fmtNum(s.contratos), label: "contratos SECOP analizados" },
    { valor: "4", label: "datasets oficiales integrados" },
    { valor: fmtNum(s.municipios), label: "municipios del Pacífico" },
    { valor: fmtBillones(s.valor_total_cop), label: "en contratación pública" },
  ];

  return (
    <div className="bg-gov-bone text-gov-azul">
      {/* ── A · HERO ─────────────────────────────────────────────── */}
      <section className="bg-gov-azul text-white" style={{ borderBottom: "4px solid rgb(255 205 0)" }}>
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-14 sm:py-20 lg:py-28">
          <p className="gov-label" style={{ fontSize: 11, letterSpacing: "0.15em", color: "rgb(255 205 0)" }}>
            PACÍFICO COLOMBIANO · DATOS.GOV.CO
          </p>
          <h1 className="mt-3 font-bold tracking-tight" style={{ fontSize: "clamp(3rem, 12vw, 6rem)", lineHeight: 1 }}>
            BRÚJULA
          </h1>
          <p className="mt-4 font-medium" style={{ fontSize: "clamp(1.05rem, 3.5vw, 1.6rem)", maxWidth: 720, lineHeight: 1.35 }}>
            Sistema de inteligencia territorial abierta del Pacífico colombiano
          </p>
          <p className="mt-3" style={{ fontSize: "clamp(0.95rem, 2.6vw, 1.15rem)", maxWidth: 640, color: "rgb(200 211 222)", lineHeight: 1.5 }}>
            Cruzamos la contratación pública con indicadores sociales para que el
            dinero del Estado deje de ser invisible.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 font-semibold"
              style={{ background: "rgb(255 205 0)", color: "rgb(10 37 64)", borderRadius: 4, padding: "13px 22px", fontSize: 15 }}
            >
              Explorar plataforma <ArrowRight size={18} />
            </Link>
            <a
              href={GITHUB}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 font-semibold"
              style={{ background: "transparent", color: "#fff", border: "2px solid rgb(255 255 255 / 0.5)", borderRadius: 4, padding: "11px 22px", fontSize: 15 }}
            >
              Ver código <ExternalLink size={16} />
            </a>
          </div>
        </div>
      </section>

      {/* ── B · MÉTRICAS (franja amarilla) ───────────────────────── */}
      <section style={{ background: "rgb(255 205 0)", color: "rgb(10 37 64)" }}>
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8 sm:py-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {metricas.map((m) => (
              <div key={m.label}>
                <p className="tabular-nums font-bold" style={{ fontSize: "clamp(1.6rem, 6vw, 2.6rem)", lineHeight: 1 }}>{m.valor}</p>
                <p className="mt-1" style={{ fontSize: 12.5, fontWeight: 500, lineHeight: 1.3 }}>{m.label}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 gov-mono" style={{ fontSize: 11, color: "rgb(10 37 64 / 0.7)" }}>
            Datos actualizados a {fmtFecha(s.fecha_max)} · {s.contratos_geo_pct}% de contratos geolocalizados
          </p>
        </div>
      </section>

      {/* ── C · TRES ACTORES ─────────────────────────────────────── */}
      <Section titulo="Tres actores, una sola verdad" subtitulo="Los datos abiertos del Estado, traducidos para quien toma decisiones.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ACTORES.map((a) => (
            <div key={a.titulo} className="bg-white p-5" style={borde2}>
              <a.icon size={26} className="text-gov-azul" />
              <h3 className="mt-3 font-semibold" style={{ fontSize: 17 }}>{a.titulo}</h3>
              <p className="mt-1.5 text-gov-muted" style={{ fontSize: 13.5, lineHeight: 1.5 }}>{a.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── D · QUÉ PUEDES HACER ─────────────────────────────────── */}
      <Section titulo="Qué puedes hacer" subtitulo="Nueve capacidades sobre los mismos datos verificables." fondo="#fff">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {MODULOS.map((m) => (
            <Link key={m.nombre} href={m.href} className="block bg-white p-4 transition-colors group" style={{ ...borde05, borderLeft: "4px solid rgb(10 37 64)" }}>
              <div className="flex items-center gap-2">
                <m.icon size={18} className="text-gov-azul flex-shrink-0" />
                <span className="font-semibold" style={{ fontSize: 14.5 }}>{m.nombre}</span>
                <ArrowRight size={14} className="ml-auto text-gov-muted group-hover:text-gov-azul transition-colors" />
              </div>
              <p className="mt-1.5 text-gov-muted" style={{ fontSize: 12.5, lineHeight: 1.45 }}>{m.desc}</p>
            </Link>
          ))}
        </div>
      </Section>

      {/* ── E · CUATRO FUENTES ───────────────────────────────────── */}
      <Section titulo="Cuatro fuentes oficiales" subtitulo="Todo verificable en el portal de datos abiertos del Estado.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {fuentes.map((f) => (
            <a key={f.id} href={`${DATOS}/d/${f.id}`} target="_blank" rel="noopener noreferrer" className="block bg-white p-4" style={borde2}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold" style={{ fontSize: 14.5 }}>{f.label}</p>
                  <p className="text-gov-muted" style={{ fontSize: 12 }}>{f.entidad}</p>
                </div>
                <ExternalLink size={15} className="text-gov-muted flex-shrink-0 mt-1" />
              </div>
              <p className="mt-2 gov-mono" style={{ fontSize: 11.5, color: "rgb(0 51 168)" }}>{f.detalle}</p>
            </a>
          ))}
        </div>
        <p className="mt-4 text-gov-muted" style={{ fontSize: 12.5, lineHeight: 1.5 }}>
          Más el catálogo completo de datos.gov.co, consultable en vivo por el copiloto.
        </p>
      </Section>

      {/* ── F · CÓMO FUNCIONA ────────────────────────────────────── */}
      <Section titulo="Cómo funciona" subtitulo="De la API pública a la decisión, en tres pasos." fondo="#fff">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PASOS.map((p, i) => (
            <div key={p.titulo} className="p-5" style={{ ...borde2, background: "rgb(244 242 236)" }}>
              <div className="flex items-center gap-2">
                <span className="gov-mono flex items-center justify-center font-bold" style={{ width: 26, height: 26, background: "rgb(10 37 64)", color: "#fff", borderRadius: 4, fontSize: 13 }}>{i + 1}</span>
                <p.icon size={20} className="text-gov-azul" />
                <span className="font-semibold" style={{ fontSize: 16 }}>{p.titulo}</span>
              </div>
              <p className="mt-2 text-gov-muted" style={{ fontSize: 13.5, lineHeight: 1.5 }}>{p.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── G · COBERTURA ────────────────────────────────────────── */}
      <Section titulo="Cobertura territorial" subtitulo={`${fmtNum(s.municipios)} municipios en los cuatro departamentos del Pacífico.`}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {s.por_departamento.map((d) => (
            <div key={d.nombre} className="bg-white p-4 text-center" style={{ ...borde05, borderBottom: "4px solid rgb(26 135 84)" }}>
              <p className="tabular-nums font-bold text-gov-azul" style={{ fontSize: 30 }}>{d.municipios}</p>
              <p className="text-gov-muted" style={{ fontSize: 13, fontWeight: 500 }}>{d.nombre}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── H · CIERRE (rojo) ────────────────────────────────────── */}
      <section style={{ background: "rgb(206 17 38)", color: "#fff" }}>
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-14 sm:py-16 text-center">
          <p className="font-bold" style={{ fontSize: "clamp(1.4rem, 5vw, 2.2rem)", lineHeight: 1.25, maxWidth: 760, margin: "0 auto" }}>
            Datos.gov.co tiene la información. BRÚJULA tiene el criterio.
          </p>
          <Link
            href="/dashboard"
            className="mt-7 inline-flex items-center justify-center gap-2 font-semibold"
            style={{ background: "#fff", color: "rgb(206 17 38)", borderRadius: 4, padding: "13px 24px", fontSize: 15 }}
          >
            Explorar plataforma <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* ── I · FOOTER ───────────────────────────────────────────── */}
      <footer className="bg-gov-azul text-white">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10 flex flex-col sm:flex-row gap-6 sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Compass size={22} className="text-gov-amarillo flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold" style={{ fontSize: 16 }}>BRÚJULA</p>
              <p style={{ fontSize: 12.5, color: "rgb(200 211 222)" }}>Sistema de inteligencia territorial abierta</p>
              <p className="mt-1" style={{ fontSize: 11.5, color: "rgb(200 211 222 / 0.7)" }}>Concurso Datos al Ecosistema 2026 · MinTIC</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2" style={{ fontSize: 12.5 }}>
            <a href={GITHUB} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1" style={{ color: "rgb(200 211 222)" }}>
              GitHub <ExternalLink size={12} />
            </a>
            <a href={DATOS} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1" style={{ color: "rgb(200 211 222)" }}>
              datos.gov.co <ExternalLink size={12} />
            </a>
            <span style={{ color: "rgb(200 211 222 / 0.7)" }}>Licencia MIT</span>
          </div>
        </div>
        <div style={{ height: 4, background: "rgb(255 205 0)" }} />
      </footer>
    </div>
  );
}

function Section({
  titulo,
  subtitulo,
  children,
  fondo,
}: {
  titulo: string;
  subtitulo?: string;
  children: React.ReactNode;
  fondo?: string;
}) {
  return (
    <section style={fondo ? { background: fondo } : undefined}>
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
        <h2 className="font-bold tracking-tight" style={{ fontSize: "clamp(1.5rem, 5vw, 2.1rem)", lineHeight: 1.15 }}>
          {titulo}
        </h2>
        {subtitulo && <p className="mt-2 text-gov-muted" style={{ fontSize: "clamp(0.9rem, 2.4vw, 1.05rem)", maxWidth: 640, lineHeight: 1.5 }}>{subtitulo}</p>}
        <div className="mt-6 sm:mt-8">{children}</div>
      </div>
    </section>
  );
}
