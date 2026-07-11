import type { BriefData } from "./brief-data";

// ─── Formateadores es-CO ─────────────────────────────────────────────────
const COP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});
const NUM = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });
const FECHA = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const fmtCOP = (n: number | null | undefined) =>
  n == null ? "—" : COP.format(Math.round(n));
const fmtNum = (n: number | null | undefined) =>
  n == null ? "—" : NUM.format(Math.round(n));

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const numOf = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function renderBriefHTML(data: BriefData): string {
  const { municipio: m, indicadores: ind, zona_olvido: z } = data;
  const esZona = data.tipo === "zona_olvidada";

  const contratos = numOf(ind.contratos);
  const valorContratos = numOf(ind.valor_contratos);
  const estabTotal = numOf(ind.estab_total);
  const estabOficial = numOf(ind.estab_oficial);
  const homicidios = numOf(ind.homicidios);
  const sisbenReg = numOf(ind.sisben_registros);
  const sisbenVuln = numOf(ind.sisben_vulnerables);
  const pobVuln = m.poblacion_vulnerable_estimada;

  // % vulnerabilidad: preferir el ponderado de la RPC de zonas; si no, muestra.
  const pctVuln =
    z?.pct_vulnerable != null
      ? numOf(z.pct_vulnerable)
      : sisbenReg > 0
        ? Math.round((sisbenVuln / sisbenReg) * 1000) / 10
        : null;

  // Inversión per cápita: preferir la de la RPC v3; si no, calcular.
  const invPerVuln =
    z?.inversion_per_vulnerable != null
      ? numOf(z.inversion_per_vulnerable)
      : pobVuln && pobVuln > 0
        ? Math.round(valorContratos / pobVuln)
        : null;

  const scoreOlvido = z?.score_olvido != null ? numOf(z.score_olvido) : null;
  const categoria = z?.categoria ? String(z.categoria) : null;

  const titulo = esZona
    ? `Alerta de Zona Olvidada — ${esc(m.nombre)}, ${esc(m.departamento)}`
    : `Ficha Territorial — ${esc(m.nombre)}, ${esc(m.departamento)}`;

  // ── Resumen ejecutivo ──────────────────────────────────────────────────
  let resumen = `El municipio de <strong>${esc(m.nombre)}</strong> (${esc(
    m.departamento
  )}) registra <strong>${fmtNum(contratos)}</strong> contratos públicos en SECOP `;
  resumen += valorContratos > 0 ? `por <strong>${fmtCOP(valorContratos)}</strong>. ` : `. `;
  if (pobVuln != null)
    resumen += `Su población vulnerable estimada (factor de expansión DANE) es de <strong>${fmtNum(
      pobVuln
    )}</strong> personas`;
  resumen += pctVuln != null ? ` (${pctVuln}% de vulnerabilidad). ` : ". ";
  if (esZona && scoreOlvido != null)
    resumen += `Este municipio presenta un <strong>score de olvido de ${scoreOlvido.toFixed(
      3
    )}</strong> (categoría ${esc(
      categoria ?? "—"
    )}), calculado sobre inversión per cápita, vulnerabilidad y violencia. `;

  const indicadoresRows: [string, string][] = [
    ["Contratos SECOP", fmtNum(contratos)],
    ["Valor total contratado", fmtCOP(valorContratos)],
    ["Población vulnerable estimada (fex DANE)", fmtNum(pobVuln)],
    ["% de vulnerabilidad", pctVuln != null ? `${pctVuln}%` : "—"],
    ["Sedes educativas (total / oficiales)", `${fmtNum(estabTotal)} / ${fmtNum(estabOficial)}`],
    ["Homicidios (Medicina Legal)", fmtNum(homicidios)],
    ["Inversión por persona vulnerable", invPerVuln != null ? fmtCOP(invPerVuln) : "$0 — sin contratos"],
  ];

  const prioridadesHTML = data.prioridades
    .map((p, i) => `<li><span class="prio-n">${i + 1}</span><span>${esc(p)}</span></li>`)
    .join("");

  const indicadoresHTML = indicadoresRows
    .map(
      ([k, v]) =>
        `<tr><td class="ind-k">${esc(k)}</td><td class="ind-v">${esc(v)}</td></tr>`
    )
    .join("");

  const fuentesHTML = data.fuentes
    .map(
      (f) => `
      <div class="fuente">
        <div class="fuente-label">${esc(f.label)}</div>
        <div class="fuente-detalle">${esc(f.detalle)}</div>
        <div class="fuente-url">${esc(f.url)}</div>
      </div>`
    )
    .join("");

  const fechaLegible = esc(FECHA.format(new Date(data.generado_en)));

  const badgeCategoria =
    esZona && categoria
      ? `<span class="badge-cat">${esc(categoria)}</span>`
      : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { font-family: Arial, "Helvetica Neue", system-ui, sans-serif; color: #0A2540; }
  @page { size: A4; margin: 0; }
  body { font-size: 11.5pt; line-height: 1.5; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

  .doc { padding: 0 0 90px 0; }
  .content { padding: 0 2cm; }

  /* Header */
  .header { background: #0A2540; color: #fff; padding: 18px 2cm; display: flex; justify-content: space-between; align-items: flex-start; }
  .header .brand { font-size: 24pt; font-weight: 700; letter-spacing: 0.5px; }
  .header .sub { font-size: 9.5pt; color: #c8d3de; margin-top: 2px; letter-spacing: 0.06em; text-transform: uppercase; }
  .header .right { text-align: right; }
  .flag { display: inline-flex; width: 46px; height: 30px; border: 1px solid rgba(255,255,255,0.3); margin-bottom: 6px; }
  .flag .f { flex: 1; }
  .flag .amarillo { background: #FFCD00; flex: 2; }
  .flag .azul { background: #0033A8; }
  .flag .rojo { background: #CE1126; }
  .header .gov { font-size: 8.5pt; color: #c8d3de; letter-spacing: 0.05em; }
  .stripe { height: 4px; background: #FFCD00; }

  /* Título */
  .titulo { font-size: 18pt; font-weight: 700; color: #0A2540; margin-top: 22px; line-height: 1.2; }
  .meta { font-size: 8.5pt; color: #5c6b7a; margin-top: 6px; border-bottom: 1px solid #e3e6ea; padding-bottom: 12px; }
  .badge-cat { display: inline-block; background: #CE1126; color: #fff; font-size: 8.5pt; font-weight: 600; padding: 2px 9px; border-radius: 3px; text-transform: uppercase; letter-spacing: 0.04em; margin-left: 8px; vertical-align: middle; }

  /* Secciones */
  .sec { margin-top: 20px; }
  .sec-h { font-size: 12.5pt; font-weight: 700; color: #0A2540; border-left: 4px solid #FFCD00; padding-left: 8px; margin-bottom: 8px; }
  .resumen { font-size: 11pt; line-height: 1.6; text-align: justify; }

  /* Tabla indicadores */
  table.ind { width: 100%; border-collapse: collapse; font-size: 10.5pt; }
  table.ind td { border: 1px solid #d5d9de; padding: 7px 10px; }
  .ind-k { background: #f4f2ec; color: #0A2540; font-weight: 500; width: 62%; }
  .ind-v { text-align: right; font-weight: 700; font-variant-numeric: tabular-nums; }

  /* Prioridades */
  ol.prio { list-style: none; }
  ol.prio li { display: flex; gap: 10px; margin-bottom: 8px; font-size: 10.5pt; align-items: flex-start; }
  .prio-n { flex-shrink: 0; background: #0A2540; color: #fff; width: 20px; height: 20px; border-radius: 3px; display: inline-flex; align-items: center; justify-content: center; font-size: 9pt; font-weight: 700; }

  .metodo { font-size: 10pt; color: #3a4a5a; line-height: 1.55; text-align: justify; background: #f9fafb; border: 1px solid #e3e6ea; padding: 12px 14px; border-radius: 4px; }

  /* Fuentes */
  .fuentes-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .fuente { border: 1px solid #d5d9de; border-left: 3px solid #0A2540; padding: 8px 11px; border-radius: 3px; }
  .fuente-label { font-weight: 700; font-size: 10pt; color: #0A2540; }
  .fuente-detalle { font-size: 9pt; color: #5c6b7a; margin: 2px 0; }
  .fuente-url { font-size: 8.5pt; color: #0033A8; font-family: "Courier New", monospace; }

  /* Footer fijo (se repite en cada página impresa) */
  .footer { position: fixed; bottom: 0; left: 0; right: 0; background: #0A2540; color: #c8d3de; font-size: 7.5pt; padding: 8px 2cm; display: flex; justify-content: space-between; align-items: center; letter-spacing: 0.03em; }
  .footer .rojo-line { position: absolute; top: -3px; left: 0; right: 0; height: 3px; background: #CE1126; }
</style>
</head>
<body>
  <div class="doc">
    <div class="header">
      <div>
        <div class="brand">BRÚJULA</div>
        <div class="sub">Sistema de Inteligencia Territorial Abierta</div>
      </div>
      <div class="right">
        <div class="flag"><div class="f amarillo"></div><div class="f azul"></div><div class="f rojo"></div></div>
        <div class="gov">República de Colombia · MinTIC</div>
      </div>
    </div>
    <div class="stripe"></div>

    <div class="content">
      <div class="titulo">${titulo}${badgeCategoria}</div>
      <div class="meta">
        DIVIPOLA ${esc(m.divipola)} · Generado el ${fechaLegible} ·
        Documento generado automáticamente con datos abiertos de datos.gov.co
      </div>

      <div class="sec">
        <div class="sec-h">Resumen ejecutivo</div>
        <p class="resumen">${resumen}</p>
      </div>

      <div class="sec">
        <div class="sec-h">Indicadores clave</div>
        <table class="ind"><tbody>${indicadoresHTML}</tbody></table>
      </div>

      <div class="sec">
        <div class="sec-h">Prioridades sugeridas</div>
        <ol class="prio">${prioridadesHTML}</ol>
      </div>

      <div class="sec">
        <div class="sec-h">Metodología y transparencia</div>
        <p class="metodo">
          Todas las cifras de este documento provienen de conjuntos de datos abiertos publicados
          en datos.gov.co. La población vulnerable se estima aplicando el factor de expansión
          estadístico (fex) del DANE sobre el censo Sisbén, no sobre una muestra. La inversión
          per cápita se calcula como el valor contratado en SECOP sobre esa población vulnerable
          estimada. Cada cifra es verificable en su fuente original mediante los enlaces de la
          sección siguiente.
        </p>
      </div>

      <div class="sec">
        <div class="sec-h">Fuentes de datos</div>
        <div class="fuentes-grid">${fuentesHTML}</div>
      </div>
    </div>
  </div>

  <div class="footer">
    <div class="rojo-line"></div>
    <span>BRÚJULA · Concurso Datos al Ecosistema 2026: IA para Colombia</span>
    <span>Este documento no constituye acto administrativo. Cifras sujetas a verificación en datos.gov.co</span>
  </div>
</body>
</html>`;
}
