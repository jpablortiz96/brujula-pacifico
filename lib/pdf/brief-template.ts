import type { BriefData } from "./brief-data";

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
  n == null ? "-" : COP.format(Math.round(n));
const fmtNum = (n: number | null | undefined) =>
  n == null ? "-" : NUM.format(Math.round(n));

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const numOf = (value: unknown): number => {
  const n = Number(value);
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

  const pctVuln =
    z?.pct_vulnerable != null
      ? numOf(z.pct_vulnerable)
      : sisbenReg > 0
        ? Math.round((sisbenVuln / sisbenReg) * 1000) / 10
        : null;

  const invPerVuln =
    z?.inversion_per_vulnerable != null
      ? numOf(z.inversion_per_vulnerable)
      : pobVuln && pobVuln > 0
        ? Math.round(valorContratos / pobVuln)
        : null;

  const scoreOlvido = z?.score_olvido != null ? numOf(z.score_olvido) : null;
  const categoria = z?.categoria ? String(z.categoria) : null;
  const fechaLegible = esc(FECHA.format(new Date(data.generado_en)));

  const titulo = esZona
    ? `Alerta de Zona Olvidada - ${esc(m.nombre)}, ${esc(m.departamento)}`
    : `Ficha Territorial - ${esc(m.nombre)}, ${esc(m.departamento)}`;

  const categoriaHTML =
    esZona && categoria
      ? `<span class="badge badge-red">${esc(categoria)}</span>`
      : `<span class="badge">Ficha territorial</span>`;

  let resumen = `El municipio de <strong>${esc(m.nombre)}</strong> (${esc(
    m.departamento
  )}) registra <strong>${fmtNum(contratos)}</strong> contratos publicos en SECOP`;
  resumen += valorContratos > 0
    ? ` por <strong>${fmtCOP(valorContratos)}</strong>. `
    : ". ";
  if (pobVuln != null) {
    resumen += `La poblacion vulnerable estimada con factor de expansion DANE es de <strong>${fmtNum(
      pobVuln
    )}</strong> personas`;
    resumen += pctVuln != null ? ` (${pctVuln}% de vulnerabilidad). ` : ". ";
  }
  if (esZona && scoreOlvido != null) {
    resumen += `El detector clasifica el territorio con score de olvido <strong>${scoreOlvido.toFixed(
      3
    )}</strong>, combinando inversion per capita, vulnerabilidad y violencia. `;
  }
  resumen +=
    "Las cifras son verificables en los conjuntos de datos abiertos citados al final del documento.";

  const indicadoresRows: [string, string][] = [
    ["Contratos SECOP", fmtNum(contratos)],
    ["Valor total contratado", fmtCOP(valorContratos)],
    ["Poblacion vulnerable estimada", fmtNum(pobVuln)],
    ["Porcentaje de vulnerabilidad", pctVuln != null ? `${pctVuln}%` : "-"],
    [
      "Sedes educativas total / oficiales",
      `${fmtNum(estabTotal)} / ${fmtNum(estabOficial)}`,
    ],
    ["Homicidios registrados", fmtNum(homicidios)],
    [
      "Inversion por persona vulnerable",
      invPerVuln != null ? fmtCOP(invPerVuln) : "$0 - sin contratos",
    ],
  ];

  const indicadoresHTML = indicadoresRows
    .map(
      ([key, value]) => `
        <tr>
          <td class="ind-key">${esc(key)}</td>
          <td class="ind-value">${esc(value)}</td>
        </tr>`
    )
    .join("");

  const prioridadesHTML = data.prioridades
    .slice(0, 4)
    .map(
      (prioridad, index) => `
        <li class="priority">
          <span class="priority-number">${index + 1}</span>
          <span>${esc(prioridad)}</span>
        </li>`
    )
    .join("");

  const fuentesHTML = data.fuentes
    .map(
      (fuente) => `
        <article class="source-card">
          <h3>${esc(fuente.label)}</h3>
          <p>${esc(fuente.detalle)}</p>
          <a href="${esc(fuente.url)}">${esc(fuente.url)}</a>
          <span>Dataset ID: ${esc(fuente.dataset_id)}</span>
        </article>`
    )
    .join("");

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${titulo}</title>
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      color: #0A2540;
      background: #F4F2EC;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10.5pt;
      line-height: 1.38;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      orphans: 3;
      widows: 3;
    }
    a { color: #0033A8; text-decoration: none; overflow-wrap: anywhere; }
    strong { font-weight: 700; }
    .page {
      width: 210mm;
      min-height: 280mm;
      padding: 0 13mm 8mm;
      background: #F4F2EC;
    }
    .page + .page { break-before: page; page-break-before: always; }
    .hero {
      margin: 0 -13mm;
      padding: 10mm 13mm 8mm;
      color: #fff;
      background: #0A2540;
      border-bottom: 2mm solid #FFCD00;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .brand { font-size: 23pt; line-height: 1; font-weight: 800; letter-spacing: 0.3pt; }
    .brand-sub {
      margin-top: 2.5mm;
      color: #C8D3DE;
      font-size: 7.8pt;
      letter-spacing: 0.7pt;
      text-transform: uppercase;
    }
    .hero-right { text-align: right; font-size: 7.8pt; color: #C8D3DE; }
    .flag {
      display: inline-grid;
      grid-template-rows: 2fr 1fr 1fr;
      width: 15mm;
      height: 9mm;
      border: 0.2mm solid rgba(255,255,255,0.45);
      margin-bottom: 2mm;
    }
    .flag-yellow { background: #FFCD00; }
    .flag-blue { background: #0033A8; }
    .flag-red { background: #CE1126; }
    .title-block {
      padding: 6mm 0 4mm;
      border-bottom: 0.35mm solid rgba(10,37,64,0.18);
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .title-row { display: flex; gap: 4mm; align-items: flex-start; justify-content: space-between; }
    h1 {
      margin: 0;
      max-width: 154mm;
      font-size: 17pt;
      line-height: 1.14;
      letter-spacing: 0;
      font-weight: 800;
      break-after: avoid;
      page-break-after: avoid;
    }
    .badge {
      display: inline-block;
      white-space: nowrap;
      color: #0A2540;
      background: #FFCD00;
      border: 0.35mm solid #0A2540;
      border-radius: 1mm;
      padding: 1.2mm 2.5mm;
      font-size: 7.4pt;
      line-height: 1;
      font-weight: 800;
      text-transform: uppercase;
    }
    .badge-red { color: #fff; background: #CE1126; border-color: #CE1126; }
    .meta {
      margin-top: 2.6mm;
      color: #5C6B7A;
      font-size: 8.5pt;
    }
    .section {
      margin-top: 5mm;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .section-title {
      margin: 0 0 2.2mm;
      padding-left: 2.5mm;
      border-left: 1.4mm solid #FFCD00;
      font-size: 11.2pt;
      line-height: 1.18;
      font-weight: 800;
      break-after: avoid;
      page-break-after: avoid;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .summary {
      margin: 0;
      padding: 4mm;
      background: #fff;
      border: 0.35mm solid #0A2540;
      border-left: 1.4mm solid #1A8754;
      border-radius: 1mm;
      font-size: 10.7pt;
    }
    .indicator-table {
      width: 100%;
      border-collapse: collapse;
      background: #fff;
      font-size: 9.8pt;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .indicator-table tr { break-inside: avoid; page-break-inside: avoid; }
    .indicator-table td {
      border: 0.3mm solid rgba(10,37,64,0.25);
      padding: 2.2mm 3mm;
      vertical-align: top;
    }
    .ind-key {
      width: 62%;
      background: #EDEAE1;
      font-weight: 700;
    }
    .ind-value {
      text-align: right;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
    }
    .priority-list { list-style: none; margin: 0; padding: 0; }
    .priority {
      display: flex;
      gap: 3mm;
      margin-bottom: 2.2mm;
      padding: 3mm;
      background: #fff;
      border: 0.3mm solid rgba(10,37,64,0.25);
      border-radius: 1mm;
      font-size: 9.6pt;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .priority-number {
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 6mm;
      height: 6mm;
      color: #fff;
      background: #0A2540;
      border-radius: 0.8mm;
      font-size: 8.4pt;
      font-weight: 800;
    }
    .support {
      padding-top: 10mm;
    }
    .method-box,
    .trace-box,
    .legal-box {
      background: #fff;
      border: 0.3mm solid rgba(10,37,64,0.25);
      border-left: 1.3mm solid #FFCD00;
      border-radius: 1mm;
      padding: 3.2mm 3.6mm;
      font-size: 9.4pt;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .method-box p,
    .trace-box p,
    .legal-box p { margin: 0; }
    .sources-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3mm;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .source-card {
      min-height: 27mm;
      padding: 3mm;
      background: #fff;
      border: 0.3mm solid rgba(10,37,64,0.28);
      border-left: 1.2mm solid #0A2540;
      border-radius: 1mm;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .source-card h3 {
      margin: 0 0 1.1mm;
      font-size: 9.2pt;
      line-height: 1.15;
      break-after: avoid;
      page-break-after: avoid;
    }
    .source-card p {
      margin: 0 0 1.3mm;
      color: #5C6B7A;
      font-size: 8.5pt;
      line-height: 1.25;
    }
    .source-card a {
      display: block;
      font-family: "Courier New", monospace;
      font-size: 8.2pt;
      line-height: 1.25;
    }
    .source-card span {
      display: block;
      margin-top: 1mm;
      color: #5C6B7A;
      font-size: 8.2pt;
    }
    .trace-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 2.5mm;
      margin-top: 2.5mm;
    }
    .trace-item {
      background: #EDEAE1;
      border-radius: 1mm;
      padding: 2.3mm;
      font-size: 8.5pt;
    }
    .trace-item strong {
      display: block;
      margin-bottom: 0.8mm;
      font-size: 7.8pt;
      text-transform: uppercase;
    }
  </style>
</head>
<body>
  <main>
    <section class="page">
      <header class="hero">
        <div>
          <div class="brand">BRUJULA</div>
          <div class="brand-sub">Sistema de inteligencia territorial abierta</div>
        </div>
        <div class="hero-right">
          <div class="flag" aria-label="Bandera de Colombia">
            <div class="flag-yellow"></div>
            <div class="flag-blue"></div>
            <div class="flag-red"></div>
          </div>
          <div>Republica de Colombia - MinTIC</div>
        </div>
      </header>

      <div class="title-block">
        <div class="title-row">
          <h1>${titulo}</h1>
          ${categoriaHTML}
        </div>
        <div class="meta">
          DIVIPOLA ${esc(m.divipola)} - Generado el ${fechaLegible} - Datos abiertos de datos.gov.co
        </div>
      </div>

      <section class="section">
        <h2 class="section-title">Resumen ejecutivo</h2>
        <p class="summary">${resumen}</p>
      </section>

      <section class="section">
        <h2 class="section-title">Indicadores clave</h2>
        <table class="indicator-table"><tbody>${indicadoresHTML}</tbody></table>
      </section>

      <section class="section">
        <h2 class="section-title">Prioridades sugeridas</h2>
        <ol class="priority-list">${prioridadesHTML}</ol>
      </section>
    </section>

    <section class="page support">
      <section class="section">
        <h2 class="section-title">Metodologia y transparencia</h2>
        <div class="method-box">
          <p>
            Todas las cifras provienen de conjuntos de datos abiertos publicados en datos.gov.co.
            La poblacion vulnerable se estima con el factor de expansion estadistico del DANE
            sobre registros Sisben. La inversion por persona vulnerable divide el valor contratado
            en SECOP entre esa poblacion estimada. El documento resume evidencia para priorizacion;
            cada dato debe verificarse contra la fuente original antes de una decision administrativa.
          </p>
        </div>
      </section>

      <section class="section">
        <h2 class="section-title">Fuentes verificables</h2>
        <div class="sources-grid">${fuentesHTML}</div>
      </section>

      <section class="section">
        <h2 class="section-title">Trazabilidad del documento</h2>
        <div class="trace-box">
          <p>Documento generado automaticamente por BRUJULA con HTML autocontenido y sin recursos remotos.</p>
          <div class="trace-grid">
            <div class="trace-item"><strong>Territorio</strong>${esc(m.nombre)} (${esc(m.departamento)})</div>
            <div class="trace-item"><strong>Tipo</strong>${esZona ? "Zona olvidada" : "Ficha territorial"}</div>
            <div class="trace-item"><strong>Fecha</strong>${fechaLegible}</div>
          </div>
        </div>
      </section>

      <section class="section">
        <h2 class="section-title">Aviso legal</h2>
        <div class="legal-box">
          <p>
            Este brief no constituye acto administrativo ni reemplaza la consulta oficial de los
            sistemas fuente. Su proposito es orientar la lectura territorial de datos abiertos y
            facilitar verificacion publica, auditoria ciudadana y priorizacion institucional.
          </p>
        </div>
      </section>
    </section>
  </main>
</body>
</html>`;
}
