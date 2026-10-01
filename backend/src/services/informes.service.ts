import { transaction, pool } from "../config/db.js";
import {
  getReport,
  saveChildren,
} from "../repositories/informes.repository.js";
import { reportSchema, type ReportInput, type User } from "../types/models.js";
import { HttpError } from "../middleware/errors.js";
export function validateFinal(data: ReportInput) {
  const missing: string[] = [];
  for (const [key, label] of [
    ["remitente", "De"],
    ["destinatario", "Para"],
    ["referencia", "Referencia"],
    ["fecha", "Fecha"],
  ] as const)
    if (!data[key].trim()) missing.push(label);
  if (!data.areas.length) missing.push("al menos un área");
  if (data.areas.some((a) => !a.nombre.trim()))
    missing.push("nombre de cada área");
  if (!data.areas.some((a) => a.materiales.length))
    missing.push("al menos un material");
  if (missing.length)
    throw new HttpError(400, `Para finalizar complete: ${missing.join(", ")}.`);
}
const fields = [
  "remitente",
  "cargo_remitente",
  "destinatario",
  "cargo_destinatario",
  "referencia",
  "fecha",
  "nota_solicitud",
  "unidad_solicitante",
  "introduccion",
  "conclusion",
  "estado",
] as const;
export async function saveReport(
  input: unknown,
  user: User,
  id?: number,
  action?: string,
) {
  if (user.rol === "JEFE")
    throw new HttpError(403, "Su rol solo permite consultar informes.");
  const data = reportSchema.parse(input);
  if (data.estado === "FINALIZADO") validateFinal(data);
  const reportId = await transaction(async (db) => {
    let currentId = id;
    if (id) {
      const { rows } = await db.query(
        "SELECT * FROM informes WHERE id=$1 FOR UPDATE",
        [id],
      );
      const old = rows[0];
      if (!old) throw new HttpError(404, "Informe no encontrado.");
      if (user.rol === "TECNICO" && old.usuario_id !== user.id)
        throw new HttpError(403, "Solo puede editar sus informes.");
      if (old.estado === "FINALIZADO")
        throw new HttpError(
          409,
          "El informe está finalizado. Duplíquelo para crear una nueva versión.",
        );
      if (data.version !== old.version)
        throw new HttpError(
          409,
          "El informe cambió en otra ventana. Vuelva a abrirlo antes de guardar.",
        );
      if (Number(data.fecha.slice(0, 4)) !== old.gestion)
        throw new HttpError(
          400,
          "La fecha debe pertenecer a la gestión del informe.",
        );
      await db.query(
        `UPDATE informes SET ${fields.map((f, i) => `${f}=$${i + 2}`).join(",")},version=version+1,updated_at=now() WHERE id=$1`,
        [id, ...fields.map((f) => data[f])],
      );
    } else {
      const year = Number(data.fecha.slice(0, 4));
      const num = (
        await db.query(
          "INSERT INTO numeracion_informes(gestion,ultimo) VALUES($1,1) ON CONFLICT(gestion) DO UPDATE SET ultimo=numeracion_informes.ultimo+1 RETURNING ultimo",
          [year],
        )
      ).rows[0].ultimo;
      currentId = (
        await db.query(
          `INSERT INTO informes(numero,gestion,codigo_completo,usuario_id,${fields.join(",")}) VALUES(${Array.from({ length: 15 }, (_, i) => `$${i + 1}`).join(",")}) RETURNING id`,
          [
            num,
            year,
            `RD-RDTIC-N° ${num}/${year}`,
            user.id,
            ...fields.map((f) => data[f]),
          ],
        )
      ).rows[0].id;
    }
    await saveChildren(db, currentId!, data);
    await db.query(
      "INSERT INTO historial_informe(informe_id,usuario_id,accion) VALUES($1,$2,$3)",
      [
        currentId,
        user.id,
        action ??
          (data.estado === "FINALIZADO"
            ? "Informe finalizado"
            : id
              ? "Borrador actualizado"
              : "Borrador creado"),
      ],
    );
    return currentId!;
  });
  return getReport(reportId, user);
}
export async function duplicateReport(id: number, user: User) {
  const original = await getReport(id, user);
  const fecha = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/La_Paz",
  }).format(new Date());
  return saveReport(
    { ...original, fecha, estado: "BORRADOR", version: undefined },
    user,
    undefined,
    `Duplicado de ${original.codigo_completo}`,
  );
}
export async function deleteReport(id: number, user: User) {
  await transaction(async (db) => {
    const report = await db.query(
      "SELECT usuario_id,estado FROM informes WHERE id=$1 FOR UPDATE",
      [id],
    );
    const r = report.rows[0];
    if (!r) throw new HttpError(404, "Informe no encontrado.");
    if (
      user.rol === "JEFE" ||
      (user.rol === "TECNICO" && r.usuario_id !== user.id)
    )
      throw new HttpError(403, "No tiene permiso para eliminar este informe.");
    if (r.estado !== "BORRADOR")
      throw new HttpError(409, "Solo se pueden eliminar borradores.");
    await db.query("DELETE FROM informes WHERE id=$1", [id]);
  });
}
export async function nextNumber(year: number) {
  const { rows } = await pool.query(
    "SELECT ultimo+1 AS numero FROM numeracion_informes WHERE gestion=$1",
    [year],
  );
  return { numero: rows[0]?.numero ?? 1, gestion: year };
}
