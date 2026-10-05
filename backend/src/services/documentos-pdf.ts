import PDFDocument from "pdfkit";
import type { Report } from "../types/models.js";
import {
  CONTENT_WIDTH,
  documentBlocks,
  PAGE,
  type Alignment,
  type Cell,
  type TableBlock,
} from "./documentos-layout.js";

type LayoutCell = {
  cell: Cell;
  col: number;
  width: number;
  lines: string[];
  size: number;
  lineHeight: number;
};

export function generatePdf(r: Report): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: [PAGE.width / 20, PAGE.height / 20],
      margins: {
        top: PAGE.top / 20,
        bottom: PAGE.bottom / 20,
        left: PAGE.left / 20,
        right: PAGE.right / 20,
      },
      bufferPages: true,
      info: { Title: r.codigo_completo, Author: r.remitente },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    const left = PAGE.left / 20,
      top = PAGE.top / 20,
      width = CONTENT_WIDTH / 20;
    const bottom = PAGE.height / 20 - PAGE.bottom / 20;
    let y = top;
    const page = () => {
      doc.addPage();
      y = top;
    };
    const font = (bold = false, italics = false) =>
      doc.font(
        bold
          ? italics
            ? "Times-BoldItalic"
            : "Times-Bold"
          : italics
            ? "Times-Italic"
            : "Times-Roman",
      );
    const drawLine = (
      text: string,
      x: number,
      textY: number,
      available: number,
      align: Alignment = "left",
      justify = false,
      underline = false,
    ) => {
      const textWidth = doc.widthOfString(text);
      const offset =
        align === "center"
          ? (available - textWidth) / 2
          : align === "right"
            ? available - textWidth
            : 0;
      const spaces = text.split(" ").length - 1;
      const wordSpacing =
        justify && spaces ? Math.max(0, (available - textWidth) / spaces) : 0;
      // Omitir width evita que PDFKit vuelva a partir las líneas que ya medimos.
      doc.text(text, x + offset, textY, { lineBreak: false, wordSpacing });
      if (underline && text) {
        const lineY = textY + doc.currentLineHeight() - 1;
        doc
          .lineWidth(0.5)
          .moveTo(x + offset, lineY)
          .lineTo(x + offset + textWidth, lineY)
          .stroke();
      }
    };
    const wrap = (value: string, available: number) => {
      const lines: string[] = [];
      for (const paragraph of value.replaceAll("\r\n", "\n").split("\n")) {
        let line = "";
        for (const word of paragraph.split(/\s+/).filter(Boolean)) {
          if (line && doc.widthOfString(`${line} ${word}`) > available) {
            lines.push(line);
            line = "";
          }
          let rest = word;
          // Un valor sin espacios también debe caber dentro de la celda.
          while (doc.widthOfString(rest) > available) {
            let end = 1;
            while (
              end < rest.length &&
              doc.widthOfString(rest.slice(0, end + 1)) <= available
            )
              end++;
            if (line) {
              lines.push(line);
              line = "";
            }
            lines.push(rest.slice(0, end));
            rest = rest.slice(end);
          }
          line += (line ? " " : "") + rest;
        }
        lines.push(line);
      }
      return lines;
    };
    const layout = (b: TableBlock) => {
      const occupied = b.widths.map(() => 0);
      const cells = b.rows.map((row, index) => {
        let col = 0;
        return row.cells.map((cell): LayoutCell => {
          while (occupied[col] > index) col++;
          const start = col,
            span = cell.span ?? 1;
          const cellWidth =
            b.widths.slice(col, col + span).reduce((sum, w) => sum + w, 0) / 20;
          for (let c = col; c < col + span; c++)
            occupied[c] = index + (cell.rowSpan ?? 1);
          col += span;
          const size = cell.size ?? b.size;
          font(cell.bold).fontSize(size);
          return {
            cell,
            col: start,
            width: cellWidth,
            lines: wrap(cell.text, cellWidth - 7),
            size,
            lineHeight: size * 1.15,
          };
        });
      });
      const heights = cells.map((row, index) =>
        Math.max(
          (b.rows[index].minHeight ?? 0) / 20,
          ...row
            .filter((c) => !c.cell.rowSpan)
            .map((c) => c.lines.length * c.lineHeight + 4),
        ),
      );
      cells.forEach((row, index) =>
        row
          .filter((c) => c.cell.rowSpan)
          .forEach((c) => {
            const total = heights
              .slice(index, index + c.cell.rowSpan!)
              .reduce((sum, h) => sum + h, 0);
            heights[index] += Math.max(
              0,
              c.lines.length * c.lineHeight + 4 - total,
            );
          }),
      );
      return { cells, heights };
    };
    const drawRow = (
      b: TableBlock,
      cells: LayoutCell[],
      index: number,
      heights: number[],
      offset = 0,
      sliceHeight = heights[index],
    ) => {
      cells.forEach((c) => {
        const x =
          left + b.widths.slice(0, c.col).reduce((sum, w) => sum + w, 0) / 20;
        const height = c.cell.rowSpan
          ? heights
              .slice(index, index + c.cell.rowSpan)
              .reduce((sum, h) => sum + h, 0)
          : sliceHeight;
        doc.lineWidth(b.borderSize / 8).strokeColor("#000000");
        if (c.cell.borderTop !== false)
          doc
            .moveTo(x, y)
            .lineTo(x + c.width, y)
            .stroke();
        if (c.cell.borderBottom !== false)
          doc
            .moveTo(x, y + height)
            .lineTo(x + c.width, y + height)
            .stroke();
        doc
          .moveTo(x, y)
          .lineTo(x, y + height)
          .stroke();
        doc
          .moveTo(x + c.width, y)
          .lineTo(x + c.width, y + height)
          .stroke();
        font(c.cell.bold).fontSize(c.size).fillColor("#000000");
        const count = Math.max(1, Math.floor((sliceHeight - 4) / c.lineHeight));
        const start = Math.round(offset / c.lineHeight);
        const lines = c.cell.rowSpan
          ? c.lines
          : c.lines.slice(start, start + count);
        const textY =
          y +
          (offset || height < heights[index]
            ? 2
            : Math.max(2, (height - lines.length * c.lineHeight) / 2));
        lines.forEach((line, i) =>
          drawLine(
            line,
            x + 3.5,
            textY + i * c.lineHeight,
            c.width - 7,
            c.cell.align,
          ),
        );
      });
      y += sliceHeight;
    };
    const blocks = documentBlocks(r);
    for (const [blockIndex, b] of blocks.entries()) {
      if (b.kind === "table") {
        const { cells, heights } = layout(b);
        const headerHeight = heights
          .slice(0, b.headerRows)
          .reduce((sum, h) => sum + h, 0);
        if (
          y + headerHeight + Math.min(heights[b.headerRows] ?? 0, 50) >
          bottom
        )
          page();
        const headers = () => {
          for (let i = 0; i < b.headerRows; i++)
            drawRow(b, cells[i], i, heights);
        };
        headers();
        for (let i = b.headerRows; i < b.rows.length; i++) {
          const rowHeight = heights[i];
          const nextHeight = b.rows[i].keepNext
            ? Math.min(heights[i + 1] ?? 0, 40)
            : 0;
          if (rowHeight <= bottom - top - headerHeight) {
            if (y + rowHeight + nextHeight > bottom) {
              page();
              headers();
            }
            drawRow(b, cells[i], i, heights);
          } else {
            let offset = 0;
            const lineHeight = Math.max(...cells[i].map((c) => c.lineHeight));
            while (offset < rowHeight - 4) {
              if (bottom - y < lineHeight + 4) {
                page();
                headers();
              }
              const slice = Math.min(
                rowHeight - offset,
                Math.floor((bottom - y - 4) / lineHeight) * lineHeight + 4,
              );
              drawRow(b, cells[i], i, heights, offset, slice);
              offset += slice - 4;
              if (offset < rowHeight - 4) {
                page();
                headers();
              }
            }
          }
        }
        y += b.after / 20;
      } else {
        let nextHeight = b.keepNext ? 30 : 0;
        const next = blocks[blockIndex + 1];
        if (b.keepNext && next?.kind === "table") {
          const { heights } = layout(next);
          nextHeight =
            heights.slice(0, next.headerRows).reduce((sum, h) => sum + h, 0) +
            Math.min(heights[next.headerRows] ?? 0, 50);
        }
        const size = b.size ?? 10;
        font(b.bold ?? b.kind === "title", b.italics)
          .fontSize(size)
          .fillColor("#000000");
        const indent = (b.indent ?? 0) / 20;
        const [label, value] = b.text.split("\t");
        const lines = wrap(value ?? label, width - indent);
        const lineHeight = size * 1.15;
        y += (b.before ?? 0) / 20;
        if (
          y +
            Math.min(lines.length * lineHeight, 60) +
            (b.after ?? 0) / 20 +
            nextHeight >
          bottom
        )
          page();
        if (value !== undefined) {
          font(true);
          drawLine(label, left, y, indent);
          font(b.bold ?? b.kind === "title", b.italics);
        }
        for (const [i, line] of lines.entries()) {
          if (y + lineHeight > bottom) page();
          const justify = b.align === "justify" && i < lines.length - 1;
          drawLine(
            line,
            left + indent,
            y,
            width - indent,
            b.align ?? (b.kind === "title" ? "center" : "left"),
            justify,
            b.underline,
          );
          y += lineHeight;
        }
        if (b.ruleAfter)
          doc
            .lineWidth(1.5)
            .moveTo(left, y + 3)
            .lineTo(left + width, y + 3)
            .stroke();
        y += (b.after ?? 0) / 20;
      }
    }
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i);
      doc.page.margins.bottom = 0;
      font().fontSize(10).fillColor("#000000");
      drawLine(
        `pág. ${i + 1}`,
        left,
        PAGE.height / 20 - PAGE.footer / 20,
        width,
        "right",
      );
    }
    doc.end();
  });
}
