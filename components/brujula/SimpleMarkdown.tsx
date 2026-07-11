"use client";

import React from "react";

// ─────────────────────────────────────────────────────────────────────────
// Renderer markdown liviano y sin dependencias, estilo brutal-gov.
// Soporta: encabezados, negritas, itálicas, código inline, listas
// (ordenadas/no), tablas GFM (| a | b |), y párrafos.
// Suficiente para las respuestas del agente sin arrastrar react-markdown.
// ─────────────────────────────────────────────────────────────────────────

/** Renderiza spans inline: **negrita**, *itálica*, `código`. */
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Tokeniza por los tres patrones a la vez.
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  const parts = text.split(regex);

  parts.forEach((part, i) => {
    if (!part) return;
    const key = `${keyPrefix}-i${i}`;
    if (part.startsWith("**") && part.endsWith("**")) {
      nodes.push(
        <strong key={key} className="font-semibold text-gov-azul">
          {part.slice(2, -2)}
        </strong>
      );
    } else if (part.startsWith("`") && part.endsWith("`")) {
      nodes.push(
        <code
          key={key}
          className="gov-mono px-1 py-0.5 rounded-sm"
          style={{ background: "rgb(244 242 236)", fontSize: "0.85em" }}
        >
          {part.slice(1, -1)}
        </code>
      );
    } else if (
      part.startsWith("*") &&
      part.endsWith("*") &&
      part.length > 2
    ) {
      nodes.push(
        <em key={key}>{part.slice(1, -1)}</em>
      );
    } else {
      nodes.push(<React.Fragment key={key}>{part}</React.Fragment>);
    }
  });

  return nodes;
}

function isTableSeparator(line: string): boolean {
  return /^\s*\|?[\s:|-]+\|?\s*$/.test(line) && line.includes("-");
}

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

export default function SimpleMarkdown({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Línea en blanco
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Tabla GFM: fila de header seguida de separador ---
    if (
      line.includes("|") &&
      i + 1 < lines.length &&
      isTableSeparator(lines[i + 1])
    ) {
      const header = splitRow(line);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].includes("|") && lines[i].trim() !== "") {
        rows.push(splitRow(lines[i]));
        i++;
      }
      blocks.push(
        <div key={key++} className="my-3 overflow-x-auto">
          <table className="w-full border-collapse gov-card" style={{ fontSize: 13 }}>
            <thead>
              <tr>
                {header.map((h, hi) => (
                  <th
                    key={hi}
                    className="text-left px-3 py-2 gov-label text-white bg-gov-azul"
                    style={{ fontSize: 10 }}
                  >
                    {renderInline(h, `th${key}-${hi}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr
                  key={ri}
                  style={{ background: ri % 2 ? "rgb(244 242 236)" : "#fff" }}
                >
                  {r.map((c, ci) => (
                    <td
                      key={ci}
                      className="px-3 py-1.5 align-top"
                      style={{ borderTop: "0.5px solid rgb(10 37 64 / 0.15)" }}
                    >
                      {renderInline(c, `td${key}-${ri}-${ci}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Encabezados
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const size = [0, 20, 17, 15, 14][level] ?? 14;
      blocks.push(
        <p
          key={key++}
          className="font-semibold text-gov-azul mt-3 mb-1"
          style={{ fontSize: size }}
        >
          {renderInline(heading[2], `h${key}`)}
        </p>
      );
      i++;
      continue;
    }

    // Lista no ordenada
    if (/^\s*[-*•]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*•]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*•]\s+/, ""));
        i++;
      }
      blocks.push(
        <ul key={key++} className="my-2 space-y-1 pl-1">
          {items.map((it, ii) => (
            <li key={ii} className="flex gap-2" style={{ fontSize: 14 }}>
              <span className="text-gov-amarillo select-none" style={{ lineHeight: "1.5" }}>
                ▸
              </span>
              <span className="flex-1">{renderInline(it, `li${key}-${ii}`)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Lista ordenada
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      blocks.push(
        <ol key={key++} className="my-2 space-y-1 pl-1">
          {items.map((it, ii) => (
            <li key={ii} className="flex gap-2" style={{ fontSize: 14 }}>
              <span
                className="gov-mono text-gov-muted select-none"
                style={{ minWidth: 16 }}
              >
                {ii + 1}.
              </span>
              <span className="flex-1">{renderInline(it, `ol${key}-${ii}`)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Párrafo (acumula líneas consecutivas de texto)
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^(#{1,4})\s+/.test(lines[i]) &&
      !/^\s*[-*•]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !(lines[i].includes("|") && i + 1 < lines.length && isTableSeparator(lines[i + 1]))
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={key++} className="my-1.5 leading-relaxed" style={{ fontSize: 14 }}>
        {renderInline(paraLines.join(" "), `p${key}`)}
      </p>
    );
  }

  return <div className="text-gov-azul">{blocks}</div>;
}
