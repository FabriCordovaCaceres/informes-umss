import { test } from "node:test";
import assert from "node:assert/strict";
import { reportSchema } from "../types/models.js";
import { hashPassword, verifyPassword } from "../utils/security.js";
test("contraseñas con salt y comparación segura", () => {
  const a = hashPassword("admin123");
  assert.notEqual(a, hashPassword("admin123"));
  assert.ok(verifyPassword("admin123", a));
  assert.equal(verifyPassword("incorrecto", a), false);
});
test("rechaza cantidades negativas y fechas inexistentes", () => {
  const r = {
    fecha: "2026-03-11",
    areas: [
      { nombre: "Planta baja", materiales: [{ material_id: 1, cantidad: -1 }] },
    ],
  };
  assert.equal(reportSchema.safeParse(r).success, false);
  assert.equal(
    reportSchema.safeParse({ ...r, areas: [], fecha: "2026-02-31" }).success,
    false,
  );
  assert.equal(reportSchema.safeParse({ ...r, areas: [] }).success, true);
});
