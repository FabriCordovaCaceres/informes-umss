import { test } from "node:test";
import assert from "node:assert/strict";
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
  assert.ok(b.some((x) => x.text === "Según nota DTIC-1."));
  const quantities = b
    .flatMap((x) => x.rows ?? [])
    .filter((x) => x[0] === "Cantidad")
    .map((x) => x[1]);
  assert.deepEqual(quantities, ["80 PZA", "58 PZA"]);
});
test("PDF A4 numera dentro de las páginas sin generar páginas adicionales para los pies", async () => {
  const pdf = await generatePdf(report);
  const raw = pdf.toString("latin1");
  assert.equal(raw.slice(0, 4), "%PDF");
  assert.equal((raw.match(/\/Type \/Page\b/g) ?? []).length, 3);
  assert.ok(raw.includes("595.28 841.89"));
});
test("DOCX produce un documento Word empaquetado", async () => {
  const buffer = await generateDocx(report);
  assert.equal(buffer.subarray(0, 2).toString(), "PK");
  assert.ok(buffer.length > 1000);
});
