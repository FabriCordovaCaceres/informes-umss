import { test } from "node:test";
import assert from "node:assert/strict";
import { inflateRawSync } from "node:zlib";
import {
  documentBlocks,
  generatePdf,
  generateDocx,
} from "./documentos.service.js";
import type { Report } from "../types/models.js";
const report: Report = {
  id: 1,
  numero: 1,
  gestion: 2026,
  codigo_completo: "RD-RDTIC-N° 1/2026",
  usuario_id: 1,
  version: 1,
  created_at: "",
  updated_at: "",
  historial: [],
  fecha: "2026-03-11",
  remitente: "Técnico de ejemplo",
  cargo_remitente: "TÉCNICO DTIC",
  destinatario: "Jefatura de ejemplo",
  cargo_destinatario: "JEFE DTIC",
  referencia: "Pedido de materiales",
  nota_solicitud: "DTIC-1",
  unidad_solicitante: "Facultad",
  introduccion: "Según nota [NOTA].",
  conclusion: "Es todo cuanto informo.",
  estado: "FINALIZADO",
  costos: [],
  adjuntos: [],
  areas: [
    {
      nombre: "Planta baja",
      destino: "Edificio",
      uso: "Red",
      materiales: [
        {
          material_id: 1,
          revision_id: 1,
          nombre: "KEYSTONE HEMBRA CAT.6",
          unidad: "PZA",
          cantidad: 80,
          descripcion: "",
          especificaciones: [{ nombre: "Conector", valor: "RJ-45" }],
        },
      ],
    },
    {
      nombre: "Planta alta",
      destino: "Edificio",
      uso: "Red",
      materiales: [
        {
          material_id: 1,
          revision_id: 1,
          nombre: "KEYSTONE HEMBRA CAT.6",
          unidad: "PZA",
          cantidad: 58,
          descripcion: "",
          especificaciones: [{ nombre: "Conector", valor: "RJ-45" }],
        },
      ],
    },
  ],
};
test("documento mantiene cantidades independientes por área e inserta la nota", () => {
  const b = documentBlocks(report);
  assert.ok(
    b.some((x) => x.kind !== "table" && x.text === "Según nota DTIC-1."),
  );
  const quantities = b
    .flatMap((x) => (x.kind === "table" ? x.rows : []))
    .filter((x) => x.cells[0].text === "Cantidad")
    .map((x) => x.cells[1].text);
  assert.deepEqual(quantities, ["80", "58"]);
});
test("PDF usa Carta y deja fluir las fichas sin forzar una hoja por material", async () => {
  const pdf = await generatePdf(report);
  const raw = pdf.toString("latin1");
  assert.equal(raw.slice(0, 4), "%PDF");
  assert.equal((raw.match(/\/Type \/Page\b/g) ?? []).length, 2);
  assert.ok(raw.includes("612 792"));
});
test("DOCX produce un documento Word empaquetado", async () => {
  const buffer = await generateDocx(report);
  assert.equal(buffer.subarray(0, 2).toString(), "PK");
  assert.ok(buffer.length > 1000);
});

// Leer el paquete permite comprobar el formato que realmente recibe Word.
function zipPart(buffer: Buffer, name: string) {
  const end = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  let cursor = buffer.readUInt32LE(end + 16);
  const count = buffer.readUInt16LE(end + 10);
  for (let i = 0; i < count; i++) {
    const length = buffer.readUInt16LE(cursor + 28);
    const filename = buffer
      .subarray(cursor + 46, cursor + 46 + length)
      .toString();
    if (filename === name) {
      const method = buffer.readUInt16LE(cursor + 10);
      const size = buffer.readUInt32LE(cursor + 20);
      const local = buffer.readUInt32LE(cursor + 42);
      const start =
        local +
        30 +
        buffer.readUInt16LE(local + 26) +
        buffer.readUInt16LE(local + 28);
      const compressed = buffer.subarray(start, start + size);
      return (
        method === 8 ? inflateRawSync(compressed) : compressed
      ).toString();
    }
    cursor +=
      46 +
      length +
      buffer.readUInt16LE(cursor + 30) +
      buffer.readUInt16LE(cursor + 32);
  }
  throw new Error(`Parte ausente: ${name}`);
}

test("Word conserva medidas, fuente y tablas combinadas de la referencia sin encabezados añadidos", async () => {
  const buffer = await generateDocx(report);
  const xml = zipPart(buffer, "word/document.xml");
  const styles = zipPart(buffer, "word/styles.xml");
  assert.match(xml, /<w:pgSz w:w="12240" w:h="15840"/);
  assert.match(
    xml,
    /<w:pgMar w:top="1134" w:right="1701" w:bottom="1135" w:left="1701"/,
  );
  assert.match(styles, /w:ascii="Times New Roman"/);
  assert.match(styles, /<w:sz w:val="20"/);
  assert.doesNotMatch(
    xml,
    /w:headerReference|w:pageBreakBefore|w:br w:type="page"/,
  );
  assert.match(xml, /<w:gridSpan w:val="3"/);
  assert.match(xml, /<w:vMerge w:val="restart"/);
  assert.match(xml, /<w:vMerge w:val="continue"/);
  assert.match(xml, /<w:gridSpan w:val="2"/);
  assert.match(xml, /<w:tblLayout w:type="fixed"/);
  assert.match(
    xml,
    /<\/w:tbl><w:sectPr>/,
    "no queda un párrafo vacío después de la última ficha",
  );
  const grids = [...xml.matchAll(/<w:tblGrid>(.*?)<\/w:tblGrid>/g)];
  for (const grid of grids) {
    const width = [...grid[1].matchAll(/w:w="(\d+)"/g)].reduce(
      (s, m) => s + Number(m[1]),
      0,
    );
    assert.equal(width, 8838, "ninguna tabla excede el ancho entre márgenes");
  }
  const footer = zipPart(buffer, "word/footer1.xml");
  assert.match(footer, /pág\. /);
  assert.match(footer, /PAGE/);
});

test("exportación no agrega títulos de costos, totales ni textos ajenos a la plantilla", () => {
  const blocks = documentBlocks({
    ...report,
    costos: [{ descripcion: "Instalación", monto: 20000 }],
  });
  const text = blocks.flatMap((b) =>
    b.kind === "table"
      ? b.rows.flatMap((r) => r.cells.map((c) => c.text))
      : [b.text],
  );
  assert.ok(text.includes("ITEM I"));
  assert.ok(text.includes("20000,00"));
  assert.ok(text.includes("Fecha:\tCochabamba, 11 de marzo del 2026"));
  assert.ok(!text.includes("TOTAL"));
  assert.ok(!text.includes("COSTO DEL TRABAJO"));
  assert.ok(
    !text.some((t) => t.includes("Fecha de emisión:") || t.includes(" · DTIC")),
  );
});

test("fichas preservan personalizaciones, marca, párrafos y cantidades del informe", async () => {
  const customized = structuredClone(report);
  const line = customized.areas[0].materiales[0];
  line.especificaciones_override = [
    { nombre: "Marca y modelo", valor: "Fabricante verificable" },
    { nombre: "Observaciones", valor: "Primera línea\nSegunda línea" },
  ];
  const xml = zipPart(await generateDocx(customized), "word/document.xml");
  assert.match(xml, /Fabricante verificable/);
  assert.match(xml, /Primera línea/);
  assert.match(xml, /Segunda línea/);
  const specs = documentBlocks(customized).filter(
    (b) => b.kind === "table" && b.role === "specifications",
  );
  assert.equal(specs[0].rows[2].cells[0].text, "Marca y modelo");
  assert.equal(specs[0].rows[3].cells[0].text, "Datos generales:");
  assert.equal(specs[0].rows[4].cells[1].text, "80");
});

test("valores técnicos largos pueden continuar en otra página de Word y PDF", async () => {
  const long = structuredClone(report);
  long.areas = [long.areas[0]];
  long.areas[0].materiales[0].especificaciones = [
    {
      nombre: "Descripción",
      valor: "Texto técnico verificable. ".repeat(180) + "FIN-DE-FICHA",
    },
  ];
  const xml = zipPart(await generateDocx(long), "word/document.xml");
  assert.match(xml, /FIN-DE-FICHA/);
  const row = [...xml.matchAll(/<w:tr[ >][\s\S]*?<\/w:tr>/g)].find((m) =>
    m[0].includes("FIN-DE-FICHA"),
  )![0];
  assert.doesNotMatch(row, /<w:cantSplit\/>/);
  const pdf = await generatePdf(long);
  assert.ok(
    (pdf.toString("latin1").match(/\/Type \/Page\b/g) ?? []).length > 1,
  );
});
