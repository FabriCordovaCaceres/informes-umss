// Run ONLY against a disposable database/API: INTEGRATION_TEST=1 node src/utils/integration.mjs
import assert from "node:assert/strict";
import { writeFile, mkdir } from "node:fs/promises";
if (process.env.INTEGRATION_TEST !== "1")
  throw new Error("Use INTEGRATION_TEST=1 only with a disposable database.");
const base = process.env.TEST_API_URL ?? "http://localhost:3000/api";
async function request(path, method = "GET", body, token, expected = 200) {
  const r = await fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await r.text();
  assert.equal(r.status, expected, `${method} ${path}: ${text}`);
  return text ? JSON.parse(text) : null;
}
const login = await request("/auth/login", "POST", {
  usuario: "admin",
  password: process.env.TEST_ADMIN_PASSWORD ?? "admin123",
});
const token = login.token;
await request("/informes", "GET", undefined, undefined, 401);
if (login.user.debe_cambiar_password) {
  await request("/informes", "GET", undefined, token, 403);
  await request(
    "/auth/change-password",
    "POST",
    {
      password_actual: process.env.TEST_ADMIN_PASSWORD ?? "admin123",
      password_nueva: "frase-de-prueba-administrador-2026",
    },
    token,
  );
}
const materials = await request("/materiales", "GET", undefined, token);
assert.ok(materials.length >= 23);
const cable = materials.find((m) => m.nombre.startsWith("ROLLO UTP"));
const keystone = materials.find((m) => m.nombre === "KEYSTONE HEMBRA CAT.6");
const access = materials.find(
  (m) => m.nombre === "PUNTO DE ACCESO INALÁMBRICO",
);
assert.ok(access.especificaciones.some((s) => s.nombre === "Memoria RAM"));
assert.ok(!access.especificaciones.some((s) => s.nombre === "Conductor"));
const defaults = await request("/configuracion", "GET", undefined, token);
const input = {
  ...defaults,
  fecha: "2026-03-11",
  referencia: "PRUEBA INTEGRAL · Ampliación de puntos de red",
  unidad_solicitante: "Facultad de Ciencias Jurídicas y Políticas",
  nota_solicitud: "SEC.ADM. 53/2026",
  estado: "BORRADOR",
  areas: [
    {
      nombre: "PLANTA BAJA",
      destino: "Edificio principal",
      uso: "Ampliación de red",
      materiales: [
        { material_id: cable.id, cantidad: 4 },
        {
          material_id: keystone.id,
          cantidad: 80,
          especificaciones_override: [
            {
              nombre: "Observación del informe",
              valor: "Ficha particular verificada",
            },
          ],
        },
      ],
    },
    {
      nombre: "PLANTA ALTA",
      destino: "Edificio principal",
      uso: "Ampliación de red",
      materiales: [
        { material_id: cable.id, cantidad: 2 },
        { material_id: keystone.id, cantidad: 58 },
      ],
    },
  ],
  costos: [{ descripcion: "TRABAJOS DE INFRAESTRUCTURA TIC", monto: 20000 }],
  adjuntos: [
    "Adjunto nota SEC.ADM. 53/2026",
    "Adjunto Especificaciones técnicas",
  ],
};
await request(
  "/informes",
  "POST",
  { ...input, areas: [], estado: "FINALIZADO" },
  token,
  400,
);
await request(
  "/informes",
  "POST",
  {
    ...input,
    areas: [
      { nombre: "Área", materiales: [{ material_id: cable.id, cantidad: -4 }] },
    ],
  },
  token,
  400,
);
let draft = await request("/informes", "POST", input, token, 201);
assert.equal(draft.areas[0].materiales[0].cantidad, 4);
assert.equal(draft.areas[1].materiales[0].cantidad, 2);
assert.equal(
  draft.areas[0].materiales[1].especificaciones[0].valor,
  "Ficha particular verificada",
);
assert.ok(draft.areas[1].materiales[1].especificaciones.length > 1);
const next = await request(
  "/informes/" + draft.id,
  "PUT",
  { ...draft, referencia: input.referencia + " (guardado)" },
  token,
);
await request("/informes/" + draft.id, "PUT", draft, token, 409);
draft = next;
const beforeSpecs = JSON.stringify(
  draft.areas[0].materiales[0].especificaciones,
);
await request(
  "/materiales/" + cable.id,
  "PUT",
  {
    ...cable,
    especificaciones: [
      ...cable.especificaciones,
      {
        nombre: "Prueba de revisión",
        valor: "No debe modificar informes anteriores",
      },
    ],
  },
  token,
);
const after = await request("/informes/" + draft.id, "GET", undefined, token);
assert.equal(
  JSON.stringify(after.areas[0].materiales[0].especificaciones),
  beforeSpecs,
);
await request("/materiales/" + cable.id, "PUT", cable, token);
const copies = await Promise.all(
  Array.from({ length: 5 }, () =>
    request("/informes/" + draft.id + "/duplicar", "POST", {}, token, 201),
  ),
);
assert.equal(new Set(copies.map((c) => c.codigo_completo)).size, 5);
assert.ok(
  copies.every(
    (c) =>
      c.id !== draft.id &&
      c.estado === "BORRADOR" &&
      c.areas[1].materiales[0].cantidad === 2,
  ),
);
const year = 2098;
const n = await request(
  "/informes/siguiente?gestion=" + year,
  "GET",
  undefined,
  token,
);
const annual = await request(
  "/informes",
  "POST",
  { ...input, fecha: `${year}-01-01` },
  token,
  201,
);
assert.equal(annual.numero, n.numero);
assert.equal(annual.gestion, year);
const stamp = Date.now();
const tech = {
  usuario: "tech" + stamp,
  nombre: "Técnico de prueba",
  correo: `tech${stamp}@local.invalid`,
  cargo: "TÉCNICO DTIC",
  rol: "TECNICO",
  activo: true,
  password: "test-password-123",
};
const techUser = await request("/usuarios", "POST", tech, token, 201);
const techLogin = await request("/auth/login", "POST", {
  usuario: tech.usuario,
  password: tech.password,
});
const techToken = techLogin.token;
assert.equal(techLogin.user.debe_cambiar_password, true);
await request("/informes", "GET", undefined, techToken, 403);
const techOtherToken = (
  await request("/auth/login", "POST", {
    usuario: tech.usuario,
    password: tech.password,
  })
).token;
await request(
  "/auth/change-password",
  "POST",
  {
    password_actual: "incorrecta",
    password_nueva: "frase-de-prueba-tecnico-2026",
  },
  techToken,
  400,
);
await request(
  "/auth/change-password",
  "POST",
  { password_actual: tech.password, password_nueva: tech.password },
  techToken,
  400,
);
await request(
  "/auth/change-password",
  "POST",
  {
    password_actual: tech.password,
    password_nueva: "frase-de-prueba-tecnico-2026",
  },
  techToken,
);
await request("/auth/me", "GET", undefined, techOtherToken, 401);
await request(
  "/auth/login",
  "POST",
  { usuario: tech.usuario, password: tech.password },
  undefined,
  401,
);
assert.equal(
  (await request("/auth/me", "GET", undefined, techToken))
    .debe_cambiar_password,
  false,
);
await request("/usuarios", "GET", undefined, techToken, 403);
await request("/materiales", "POST", cable, techToken, 403);
await request("/informes/" + draft.id, "GET", undefined, techToken, 403);
assert.equal(
  (await request("/informes", "GET", undefined, techToken)).length,
  0,
);
const own = await request("/informes", "POST", input, techToken, 201);
await request("/informes/" + own.id, "DELETE", undefined, techToken, 204);
const head = {
  ...tech,
  usuario: "head" + stamp,
  correo: `head${stamp}@local.invalid`,
  rol: "JEFE",
};
await request("/usuarios", "POST", head, token, 201);
const headLogin = await request("/auth/login", "POST", {
  usuario: head.usuario,
  password: head.password,
});
const headToken = headLogin.token;
assert.equal(headLogin.user.debe_cambiar_password, true);
await request("/informes", "GET", undefined, headToken, 403);
await request(
  "/auth/change-password",
  "POST",
  {
    password_actual: head.password,
    password_nueva: "frase-de-prueba-jefatura-2026",
  },
  headToken,
);
await request("/informes", "POST", input, headToken, 403);
await request("/informes/" + draft.id, "GET", undefined, headToken);
const finalized = await request(
  "/informes/" + draft.id,
  "PUT",
  { ...draft, estado: "FINALIZADO" },
  token,
);
await request("/informes/" + draft.id, "PUT", finalized, token, 409);
await request("/informes/" + draft.id, "DELETE", undefined, token, 409);
await mkdir("/tmp/umss-exports", { recursive: true });
for (const ext of ["pdf", "docx"]) {
  const response = await fetch(base + `/informes/${draft.id}/${ext}`, {
    headers: { Authorization: "Bearer " + token },
  });
  assert.equal(response.status, 200);
  const buffer = Buffer.from(await response.arrayBuffer());
  assert.ok(buffer.length > 1000);
  assert.equal(
    buffer.subarray(0, ext === "pdf" ? 4 : 2).toString(),
    ext === "pdf" ? "%PDF" : "PK",
  );
  await writeFile(`/tmp/umss-exports/informe.${ext}`, buffer);
}
const history = await request("/informes/" + draft.id, "GET", undefined, token);
assert.ok(history.historial.some((h) => h.accion.includes("DOCX")));
assert.ok(history.historial.some((h) => h.accion === "Informe finalizado"));
for (const r of [...copies, annual])
  await request("/informes/" + r.id, "DELETE", undefined, token, 204);
await request(
  "/usuarios/" + techUser.id,
  "PUT",
  { ...tech, activo: false },
  token,
);
await request("/auth/me", "GET", undefined, techToken, 401);
await request("/auth/logout", "POST", {}, token, 204);
await request("/auth/me", "GET", undefined, token, 401);
console.log(
  "PASS: autenticación, roles, catálogo y revisiones, validación, borradores, concurrencia, numeración anual, duplicación, finalización, PDF, DOCX, historial y revocación.",
);
console.log(
  "Exportaciones verificables: /tmp/umss-exports/informe.pdf y /tmp/umss-exports/informe.docx",
);
