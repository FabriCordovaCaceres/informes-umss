import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeightRule,
  LineRuleType,
  Packer,
  PageNumber,
  Paragraph,
  Tab,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TabStopType,
  TextRun,
  UnderlineType,
  VerticalAlign,
  WidthType,
} from "docx";
import type { Report } from "../types/models.js";
import {
  documentBlocks,
  PAGE,
  type ParagraphBlock,
  type TableBlock,
} from "./documentos-layout.js";

const alignments = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
  justify: AlignmentType.JUSTIFIED,
};

function paragraph(b: ParagraphBlock) {
  const children = b.text.split(/(\t|\n)/).map(
    (part, index) =>
      new TextRun({
        children: part === "\t" ? [new Tab()] : undefined,
        text: part === "\t" || part === "\n" ? undefined : part,
        break: part === "\n" ? 1 : undefined,
        font: "Times New Roman",
        size: (b.size ?? 10) * 2,
        bold:
          b.text.includes("\t") && index === 0
            ? true
            : (b.bold ?? b.kind === "title"),
        italics: b.italics,
        underline: b.underline ? { type: UnderlineType.SINGLE } : undefined,
      }),
  );
  const labeled = b.text.includes("\t");
  return new Paragraph({
    alignment: alignments[b.align ?? (b.kind === "title" ? "center" : "left")],
    spacing: {
      before: b.before ?? 0,
      after: b.after ?? 0,
      line: 240,
      lineRule: LineRuleType.AUTO,
    },
    keepNext: b.keepNext,
    widowControl: true,
    indent: b.indent
      ? { left: b.indent, hanging: labeled ? b.indent : undefined }
      : undefined,
    tabStops: labeled
      ? [{ type: TabStopType.LEFT, position: b.indent! }]
      : undefined,
    border: b.ruleAfter
      ? {
          bottom: {
            style: BorderStyle.SINGLE,
            size: 12,
            color: "000000",
            space: 4,
          },
        }
      : undefined,
    children,
  });
}

function table(b: TableBlock) {
  const border = {
    style: BorderStyle.SINGLE,
    size: b.borderSize,
    color: "000000",
  };
  const none = { style: BorderStyle.NIL, size: 0 };
  const occupied = b.widths.map(() => 0);
  return new Table({
    width: {
      size: b.widths.reduce((sum, w) => sum + w, 0),
      type: WidthType.DXA,
    },
    columnWidths: b.widths,
    layout: TableLayoutType.FIXED,
    margins: { top: 20, bottom: 20, left: 70, right: 70 },
    borders: {
      top: border,
      bottom: border,
      left: border,
      right: border,
      insideHorizontal: border,
      insideVertical: border,
    },
    rows: b.rows.map((row, index) => {
      let col = 0;
      return new TableRow({
        tableHeader: index < b.headerRows,
        cantSplit: row.cantSplit ?? false,
        height: row.minHeight
          ? { value: row.minHeight, rule: HeightRule.ATLEAST }
          : undefined,
        children: row.cells.map((cell) => {
          while (occupied[col] > index) col++;
          const span = cell.span ?? 1;
          const width = b.widths
            .slice(col, col + span)
            .reduce((sum, w) => sum + w, 0);
          for (let c = col; c < col + span; c++)
            occupied[c] = index + (cell.rowSpan ?? 1);
          col += span;
          return new TableCell({
            width: { size: width, type: WidthType.DXA },
            columnSpan: cell.span,
            rowSpan: cell.rowSpan,
            verticalAlign: VerticalAlign.CENTER,
            borders: {
              top: cell.borderTop === false ? none : border,
              bottom: cell.borderBottom === false ? none : border,
              left: border,
              right: border,
            },
            children: cell.text
              .replaceAll("\r\n", "\n")
              .split("\n")
              .map(
                (line) =>
                  new Paragraph({
                    alignment: alignments[cell.align ?? "left"],
                    spacing: {
                      before: 0,
                      after: 0,
                      line: 240,
                      lineRule: LineRuleType.AUTO,
                    },
                    keepNext: row.keepNext,
                    widowControl: true,
                    children: [
                      new TextRun({
                        text: line,
                        font: "Times New Roman",
                        size: (cell.size ?? b.size) * 2,
                        bold: cell.bold,
                      }),
                    ],
                  }),
              ),
          });
        }),
      });
    }),
  });
}

export async function generateDocx(r: Report) {
  const blocks = documentBlocks(r);
  const children = blocks.flatMap((b, index) =>
    b.kind === "table"
      ? [
          table(b),
          ...(index === blocks.length - 1
            ? []
            : [
                new Paragraph({
                  spacing: {
                    before: 0,
                    after: 0,
                    line: b.after,
                    lineRule: LineRuleType.EXACT,
                  },
                  children: [new TextRun({ text: "", size: 2 })],
                }),
              ]),
        ]
      : [paragraph(b)],
  );
  return Packer.toBuffer(
    new Document({
      creator: r.remitente,
      title: r.codigo_completo,
      styles: {
        default: {
          document: {
            run: {
              font: "Times New Roman",
              size: 20,
              color: "000000",
              language: { value: "es-BO" },
            },
            paragraph: {
              spacing: {
                before: 0,
                after: 0,
                line: 240,
                lineRule: LineRuleType.AUTO,
              },
            },
          },
        },
      },
      features: { updateFields: true },
      sections: [
        {
          properties: {
            page: {
              size: { width: PAGE.width, height: PAGE.height },
              margin: {
                top: PAGE.top,
                bottom: PAGE.bottom,
                left: PAGE.left,
                right: PAGE.right,
                header: 708,
                footer: PAGE.footer,
              },
            },
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  spacing: { before: 0, after: 0, line: 240 },
                  children: [
                    new TextRun({ text: "pág. ", size: 20 }),
                    new TextRun({ children: [PageNumber.CURRENT], size: 20 }),
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
