import PDFDocument from "pdfkit";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  Footer,
  Header,
  PageNumber,
  BorderStyle,
} from "docx";
import type { Report } from "../types/models.js";
type Block = {
  kind: "title" | "text" | "table" | "page";
  text?: string;
  rows?: string[][];
  widths?: number[];
  plain?: boolean;
};
export function dateLabel(date: string) {
  return new Intl.DateTimeFormat("es-BO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date + "T12:00:00Z"));
}
export function documentBlocks(r: Report): Block[] {
  const blocks: Block[] = [];
  const title = (text: string) => blocks.push({ kind: "title", text });
  const text = (text: string) => blocks.push({ kind: "text", text });
  const table = (rows: string[][], widths?: number[], plain = false) =>
    blocks.push({ kind: "table", rows, widths, plain });
  title("INFORME TÉCNICO");
  title(r.codigo_completo);
  if (r.estado === "BORRADOR") title("BORRADOR");
  table(
    [
      ["De:", `${r.remitente}\n${r.cargo_remitente}`],
      ["Para:", `${r.destinatario}\n${r.cargo_destinatario}`],
      ["Ref.:", r.referencia],
      ["Fecha:", `Cochabamba, ${dateLabel(r.fecha)}`],
    ],
    [0.15, 0.85],
    true,
  );
  text(r.introduccion.replaceAll("[NOTA]", r.nota_solicitud));
  for (const a of r.areas) {
    title("UNIVERSIDAD MAYOR DE SAN SIMÓN");
    title(`PEDIDO DE MATERIALES — ${a.nombre}`);
    text(
      `Fecha de emisión: ${dateLabel(r.fecha)} • DTIC • Cochabamba, Bolivia`,
    );
    text(`DESTINO: ${a.destino}\nUSO: ${a.uso}`);
    table(
      [
        ["N°", "CANTIDAD", "UNIDAD", "DETALLE"],
        ...a.materiales.map((m, i) => [
          String(i + 1),
          String(m.cantidad),
          m.unidad,
          m.nombre,
        ]),
      ],
      [0.07, 0.14, 0.12, 0.67],
    );
  }
  if (r.costos.length) {
    title("COSTO DEL TRABAJO");
    table(
      [
        ["N°", "DESCRIPCIÓN", "COSTO Bs."],
        ...r.costos.map((c, i) => [
          String(i + 1),
          c.descripcion,
          c.monto.toFixed(2),
        ]),
        ["", "TOTAL", r.costos.reduce((s, c) => s + c.monto, 0).toFixed(2)],
      ],
      [0.07, 0.73, 0.2],
    );
  }
  text(r.conclusion);
  text(`\n${r.remitente}\n${r.cargo_remitente}`);
  text("C.c. Archivos DTIC");
  r.adjuntos.forEach(text);
  for (const a of r.areas) {
    blocks.push({ kind: "page" });
    title(`ESPECIFICACIONES TÉCNICAS ${a.nombre}`);
    for (const [i, m] of a.materiales.entries()) {
      if (i > 0) {
        blocks.push({ kind: "page" });
        title(`ESPECIFICACIONES TÉCNICAS ${a.nombre}`);
      }
      title("ESPECIFICACIONES TÉCNICAS");
      title(`ITEM ${i + 1}: ${m.nombre}`);
      table(
        [
          ["Datos generales", ""],
          ["Cantidad", `${m.cantidad} ${m.unidad}`],
          ["Datos técnicos", ""],
          ...m.especificaciones.map((s) => [s.nombre, s.valor]),
          ...(m.especificaciones.length
            ? []
            : [["Especificaciones", "Sin datos técnicos registrados."]]),
        ],
        [0.3, 0.7],
      );
    }
  }
  return blocks;
}
export function generatePdf(r: Report): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 62, bottom: 60, left: 57, right: 57 },
      bufferPages: true,
      info: { Title: r.codigo_completo, Author: r.remitente },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    const width = doc.page.width - 114;
    let y = 62;
    const bottom = () => doc.page.height - 65;
    const page = () => {
      doc.addPage();
      y = 62;
    };
    for (const b of documentBlocks(r)) {
      if (b.kind === "page") {
        page();
        continue;
      }
      if (b.kind === "table") {
        if (y + 60 > bottom()) page();
        const widths = (b.widths ?? [0.3, 0.7]).map((w) => w * width);
        doc.font("Times-Roman").fontSize(10);
        for (const row of b.rows!) {
          // Split oversized cells into line-height slices so even long specifications fit on A4.
          const wrapped = row.map((cell, i) => {
            const lines: string[] = [];
            for (const para of cell.split("\n")) {
              let line = "";
              for (const word of para.split(/\s+/)) {
                if (
                  doc.widthOfString(line + " " + word) > widths[i] - 12 &&
                  line
                ) {
                  lines.push(line);
                  line = word;
                } else line += (line ? " " : "") + word;
              }
              lines.push(line);
            }
            return lines;
          });
          const total = Math.max(...wrapped.map((c) => c.length));
          if (
            total * 12 + 12 <= bottom() - 62 &&
            y + total * 12 + 12 > bottom()
          )
            page();
          let start = 0;
          while (start < total) {
            if (y + 28 > bottom()) page();
            const count = Math.min(
              total - start,
              Math.max(1, Math.floor((bottom() - y - 12) / 12)),
            );
            const height = count * 12 + 12;
            let x = 57;
            row.forEach((_, i) => {
              if (!b.plain)
                doc
                  .rect(x, y, widths[i], height)
                  .lineWidth(0.5)
                  .strokeColor("#555555")
                  .stroke();
              doc
                .fillColor("#111111")
                .text(
                  wrapped[i].slice(start, start + count).join("\n"),
                  x + 6,
                  y + 6,
                  {
                    width: widths[i] - 12,
                    height: height - 8,
                    lineBreak: true,
                    lineGap: 0,
                    align: "left",
                  },
                );
              x += widths[i];
            });
            y += height;
            start += count;
          }
        }
        y += 12;
      } else {
        doc
          .font(b.kind === "title" ? "Times-Bold" : "Times-Roman")
          .fontSize(b.kind === "title" ? 12 : 11);
        const height =
          doc.heightOfString(b.text!, {
            width,
            align: b.kind === "title" ? "center" : "justify",
          }) + 10;
        if (y + Math.min(height, 70) + (b.kind === "title" ? 90 : 0) > bottom())
          page();
        doc.text(b.text!, 57, y, {
          width,
          align: b.kind === "title" ? "center" : "justify",
        });
        y = doc.y + 12;
      }
    }
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i);
      const previousBottom = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      doc.font("Times-Roman").fontSize(9).fillColor("#555555");
      doc.text(
        "UMSS · Dirección de Tecnologías de Información y Comunicación",
        57,
        30,
        { width, align: "center", lineBreak: false },
      );
      doc.text(`pág. ${i + 1}`, 57, doc.page.height - 35, {
        width,
        align: "right",
        lineBreak: false,
      });
      doc.page.margins.bottom = previousBottom;
    }
    doc.end();
  });
}
export async function generateDocx(r: Report) {
  const borders = Object.fromEntries(
    ["top", "bottom", "left", "right"].map((k) => [
      k,
      { style: BorderStyle.SINGLE, size: 4, color: "555555" },
    ]),
  );
  const children = documentBlocks(r).map((b) => {
    if (b.kind === "table")
      return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: b.rows!.map(
          (row, index) =>
            new TableRow({
              tableHeader: index === 0,
              cantSplit: true,
              children: row.map(
                (cell, i) =>
                  new TableCell({
                    borders: b.plain
                      ? Object.fromEntries(
                          ["top", "bottom", "left", "right"].map((k) => [
                            k,
                            { style: BorderStyle.NONE, size: 0 },
                          ]),
                        )
                      : borders,
                    width: {
                      size: (b.widths ?? [0.3, 0.7])[i] * 100,
                      type: WidthType.PERCENTAGE,
                    },
                    children: cell.split("\n").map(
                      (text) =>
                        new Paragraph({
                          children: [new TextRun({ text, bold: index === 0 })],
                          spacing: { after: 60, before: 60 },
                        }),
                    ),
                  }),
              ),
            }),
        ),
      });
    if (b.kind === "page")
      return new Paragraph({ pageBreakBefore: true, text: "" });
    return new Paragraph({
      alignment:
        b.kind === "title" ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
      keepNext: b.kind === "title",
      spacing: { after: 180, before: b.kind === "title" ? 120 : 80 },
      children: (b.text ?? "")
        .split("\n")
        .flatMap((text, i) => [
          new TextRun({ text, bold: b.kind === "title", break: i ? 1 : 0 }),
        ]),
    });
  });
  return Packer.toBuffer(
    new Document({
      styles: {
        default: {
          document: {
            run: { font: "Times New Roman", size: 22 },
            paragraph: { spacing: { line: 276 } },
          },
        },
      },
      sections: [
        {
          properties: {
            page: {
              size: { width: 11906, height: 16838 },
              margin: { top: 1240, bottom: 1240, left: 1140, right: 1140 },
            },
          },
          headers: {
            default: new Header({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: "UNIVERSIDAD MAYOR DE SAN SIMÓN · DTIC",
                      size: 18,
                    }),
                  ],
                }),
              ],
            }),
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [
                    new TextRun("pág. "),
                    new TextRun({ children: [PageNumber.CURRENT] }),
                  ],
                }),
              ],
            }),
          },
          children,
        },
      ],
    }),
  );
}
