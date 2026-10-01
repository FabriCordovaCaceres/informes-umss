import { readFile } from "node:fs/promises";
import { pool, transaction } from "../config/db.js";
import { hashPassword } from "./security.js";
import { saveMaterial } from "../repositories/materiales.repository.js";
import { materialSchema } from "../types/models.js";
import { z } from "zod";
try {
  await transaction(async (db) => {
    for (const name of ["ADMINISTRADOR", "TECNICO", "JEFE"])
      await db.query(
        "INSERT INTO roles(nombre) VALUES($1) ON CONFLICT DO NOTHING",
        [name],
      );
    // The reference is RD-RDTIC-N° 17/2026, so reserve that sequence
    // without creating a historical report that is absent from this database.
    const initialYear = z.coerce
      .number()
      .int()
      .min(1900)
      .max(9999)
      .parse(process.env.INITIAL_GESTION ?? "2026");
    const initialLastNumber = z.coerce
      .number()
      .int()
      .min(0)
      .max(999999)
      .parse(process.env.INITIAL_LAST_NUMERO ?? "17");
    if (initialLastNumber > 0)
      await db.query(
        "INSERT INTO numeracion_informes(gestion,ultimo) VALUES($1,$2) ON CONFLICT DO NOTHING",
        [initialYear, initialLastNumber],
      );
    const exists = await db.query(
      "SELECT id FROM usuarios WHERE usuario='admin'",
    );
    if (!exists.rowCount) {
      const password =
        process.env.SEED_ADMIN_PASSWORD ??
        (process.env.NODE_ENV === "production" ? "" : "admin123");
      if (password.length < 8)
        throw new Error(
          "Configure SEED_ADMIN_PASSWORD con al menos 8 caracteres.",
        );
      await db.query(
        "INSERT INTO usuarios(usuario,nombre,correo,password_hash,cargo,rol_id,debe_cambiar_password) VALUES('admin','Técnico de ejemplo','admin@local.invalid', $1,'TÉCNICO DTIC',(SELECT id FROM roles WHERE nombre='ADMINISTRADOR'),true)",
        [hashPassword(password)],
      );
    }
    await db.query(
      "INSERT INTO configuracion(id,datos) VALUES(1,$1) ON CONFLICT DO NOTHING",
      [
        JSON.stringify({
          remitente: "Técnico de ejemplo",
          cargo_remitente: "TÉCNICO DTIC",
          destinatario: "Jefatura de ejemplo",
          cargo_destinatario: "JEFE DTIC",
          introduccion:
            "Mediante la presente, informo a su autoridad de acuerdo a lo solicitado en nota [NOTA], se realizó el relevamiento técnico en las áreas designadas. Adjunto a esta nota se encuentra el detalle del material de red requerido, así como sus especificaciones técnicas, el cual deberá ser adquirido por la unidad solicitante para proceder con la instalación correspondiente.",
          conclusion: "Es todo cuanto informo para su conocimiento y fines.",
        }),
      ],
    );
  });
  const materials = z
    .array(materialSchema)
    .parse(
      JSON.parse(
        await readFile(
          new URL("../../../database/materiales.json", import.meta.url),
          "utf8",
        ),
      ),
    );
  for (const m of materials)
    if (
      !(
        await pool.query("SELECT id FROM materiales WHERE nombre=$1", [
          m.nombre,
        ])
      ).rowCount
    )
      await saveMaterial(m);
  console.log(
    `Seed completado: roles, administrador y ${materials.length} materiales del catálogo institucional. No se sobrescribieron registros existentes.`,
  );
} finally {
  await pool.end();
}
