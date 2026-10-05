import type { Report } from "../types/models.js";

// Twips del Word institucional de docs/InformeTecnico_RD-RDTIC-N° Derecho.docx.
export const PAGE = {
  width: 12240,
  height: 15840,
  top: 1134,
  bottom: 1135,
  left: 1701,
  right: 1701,
  footer: 708,
};
export const CONTENT_WIDTH = PAGE.width - PAGE.left - PAGE.right;
export type Alignment = "left" | "center" | "right" | "justify";
export type Cell = {
  text: string;
  span?: number;
  rowSpan?: number;
  bold?: boolean;
  size?: number;
  align?: Alignment;
  borderTop?: boolean;
  borderBottom?: boolean;
};
export type Row = {
  cells: Cell[];
  minHeight?: number;
  keepNext?: boolean;
  cantSplit?: boolean;
};
export type ParagraphBlock = {
  kind: "title" | "text";
  text: string;
  bold?: boolean;
  italics?: boolean;
  underline?: boolean;
  size?: number;
  align?: Alignment;
  before?: number;
  after?: number;
  keepNext?: boolean;
  indent?: number;
  ruleAfter?: boolean;
};
export type TableBlock = {
  kind: "table";
  role: "materials" | "costs" | "specifications";
  rows: Row[];
  widths: number[];
  headerRows: number;
  borderSize: number;
  size: number;
  after: number;
};
export type Block = ParagraphBlock | TableBlock;

export function dateLabel(date: string) {
  return new Intl.DateTimeFormat("es-BO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })
    .format(new Date(date + "T12:00:00Z"))
    .replace(/ de (\d{4})$/, " del $1");
}

export function documentBlocks(r: Report): Block[] {
  const blocks: Block[] = [];
  const text = (
    value: string,
    options: Omit<ParagraphBlock, "kind" | "text"> = {},
  ) => blocks.push({ kind: "text", text: value, ...options });
  const prose = (value: string) => {
    value
      .replaceAll("\r\n", "\n")
      .split("\n")
      .forEach((line) =>
        text(line, { align: "justify", after: line ? 120 : 0 }),
      );
  };
  blocks.push(
    { kind: "title", text: "INFORME TÉCNICO", underline: true, keepNext: true },
    {
      kind: "title",
      text: r.codigo_completo,
      underline: true,
      after: 240,
      keepNext: true,
    },
  );
  if (r.estado === "BORRADOR")
    blocks.push({
      kind: "title",
      text: "BORRADOR",
      after: 120,
      keepNext: true,
    });
  text(`De:\t${r.remitente}`, { indent: 709, keepNext: true });
  text(r.cargo_remitente, { indent: 709, bold: true, after: 240 });
  text(`Para:\t${r.destinatario}`, { indent: 709, keepNext: true });
  text(r.cargo_destinatario, { indent: 709, bold: true, after: 240 });
  text(`Ref.:\t${r.referencia}`, { indent: 851, after: 240 });
  text(`Fecha:\tCochabamba, ${dateLabel(r.fecha)}`, {
    indent: 709,
    after: 240,
    ruleAfter: true,
  });
  prose(r.introduccion.replaceAll("[NOTA]", r.nota_solicitud));

  const [year, month, day] = r.fecha.split("-").map(Number);
  const center = (value: string, options: Partial<Cell> = {}): Cell => ({
    text: value,
    align: "center",
    ...options,
  });
  for (const a of r.areas) {
    blocks.push({
      kind: "table",
      role: "materials",
      // Cuadrícula compartida por los encabezados combinados y las cuatro columnas del pedido.
      widths: [480, 1250, 950, 2495, 1234, 1234, 1195],
      headerRows: 6,
      borderSize: 8,
      size: 9,
      after: 240,
      rows: [
        {
          minHeight: 1395,
          keepNext: true,
          cantSplit: true,
          cells: [
            center("UNIVERSIDAD MAYOR DE SAN SIMON", {
              span: 3,
              bold: true,
              size: 8,
              borderBottom: false,
            }),
            center(
              `PEDIDO DE MATERIALES\n${a.nombre.toLocaleUpperCase("es-BO")}`,
              { rowSpan: 3, bold: true, size: 16 },
            ),
            center("FECHA DE EMISION", { span: 3, bold: true, size: 8 }),
          ],
        },
        {
          minHeight: 315,
          keepNext: true,
          cantSplit: true,
          cells: [
            center("DTIC", {
              span: 3,
              bold: true,
              size: 8,
              borderTop: false,
              borderBottom: false,
            }),
            ...["DÍA", "MES", "AÑO"].map((value) =>
              center(value, { bold: true, size: 8 }),
            ),
          ],
        },
        {
          minHeight: 315,
          keepNext: true,
          cantSplit: true,
          cells: [
            center("COCHABAMBA- BOLIVIA", {
              span: 3,
              bold: true,
              size: 8,
              borderTop: false,
            }),
            ...[day, month, year].map((value) =>
              center(String(value), { size: 8 }),
            ),
          ],
        },
        {
          keepNext: true,
          cantSplit: true,
          cells: [
            { text: "DESTINO:", span: 3, bold: true, borderBottom: false },
            { text: a.destino, span: 4, borderBottom: false },
          ],
        },
        {
          keepNext: true,
          cantSplit: true,
          cells: [
            { text: "USO:", span: 3, bold: true, borderTop: false },
            { text: a.uso, span: 4, borderTop: false },
          ],
        },
        {
          keepNext: true,
          cantSplit: true,
          cells: [
            center("N°", { bold: true }),
            center("CANTIDAD", { bold: true }),
            center("UNIDAD", { bold: true }),
            center("DETALLE", { span: 4, bold: true }),
          ],
        },
        ...a.materiales.map((m, i): Row => ({
          cantSplit: true,
          cells: [
            center(String(i + 1)),
            center(String(m.cantidad)),
            center(m.unidad),
            { text: m.nombre, span: 4 },
          ],
        })),
      ],
    });
  }
  if (r.costos.length) {
    blocks.push({
      kind: "table",
      role: "costs",
      widths: [1072, 6628, 1138],
      headerRows: 1,
      borderSize: 4,
      size: 9,
      after: 240,
      rows: [
        {
          keepNext: true,
          cantSplit: true,
          cells: [
            center("ITEM I", { bold: true }),
            center("Descripción", { bold: true }),
            center("Costo Bs.", { bold: true }),
          ],
        },
        ...r.costos.map((c, i): Row => ({
          cantSplit: true,
          cells: [
            center(String(i + 1)),
            { text: c.descripcion },
            { text: c.monto.toFixed(2).replace(".", ","), align: "right" },
          ],
        })),
      ],
    });
  }
  prose(r.conclusion);
  text(r.remitente, { size: 11, before: 360, keepNext: true });
  text(r.cargo_remitente, { size: 11, bold: true, after: 240 });
  text("C.c Archivos DTIC", { size: 9, italics: true });
  for (const a of r.adjuntos) text(a, { size: 9, italics: true });

  for (const a of r.areas) {
    if (!a.materiales.length) continue;
    blocks.push({
      kind: "title",
      text: `ESPECIFICACIONES TÉCNICAS ${a.nombre.toLocaleUpperCase("es-BO")}`,
      size: 14,
      italics: true,
      underline: true,
      before: 360,
      after: 240,
      keepNext: true,
    });
    for (const [i, m] of a.materiales.entries()) {
      const specs = m.especificaciones_override ?? m.especificaciones;
      const brand = (name: string) =>
        /^marca(?: y modelo)?$/i.test(name.trim());
      blocks.push({
        kind: "table",
        role: "specifications",
        widths: [2524, 6314],
        headerRows: 2,
        borderSize: 4,
        size: 10,
        after: 240,
        rows: [
          {
            keepNext: true,
            cantSplit: true,
            cells: [
              center("ESPECIFICACIONES TÉCNICAS", { span: 2, bold: true }),
            ],
          },
          {
            keepNext: true,
            cantSplit: true,
            cells: [
              { text: `ITEM ${i + 1}:`, bold: true },
              { text: m.nombre, bold: true },
            ],
          },
          ...specs
            .filter((s) => brand(s.nombre))
            .map((s): Row => ({
              cells: [{ text: s.nombre }, { text: s.valor }],
            })),
          {
            keepNext: true,
            cantSplit: true,
            cells: [{ text: "Datos generales:", span: 2, bold: true }],
          },
          {
            keepNext: true,
            cantSplit: true,
            cells: [{ text: "Cantidad" }, { text: String(m.cantidad) }],
          },
          {
            keepNext: specs.some((s) => !brand(s.nombre)),
            cantSplit: true,
            cells: [{ text: "Datos técnicos:", span: 2, bold: true }],
          },
          ...specs
            .filter((s) => !brand(s.nombre))
            .map((s): Row => ({
              cells: [{ text: s.nombre }, { text: s.valor }],
            })),
        ],
      });
    }
  }
  return blocks;
}
