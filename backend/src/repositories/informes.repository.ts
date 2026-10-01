import { pool } from "../config/db.js";
import type { PoolClient } from "pg";
import type { Report, ReportInput, User } from "../types/models.js";
import { HttpError } from "../middleware/errors.js";
export async function listReports(user: User) {
  return (
    await pool.query(
      `SELECT id,numero,gestion,codigo_completo,usuario_id,referencia,unidad_solicitante,fecha,estado,updated_at FROM informes ${user.rol === "TECNICO" ? "WHERE usuario_id=$1" : ""} ORDER BY gestion DESC,numero DESC`,
      user.rol === "TECNICO" ? [user.id] : [],
    )
  ).rows;
}
export async function getReport(
  id: number,
  user: User,
  db: Pick<PoolClient, "query"> = pool,
): Promise<Report> {
  const { rows } = await db.query("SELECT * FROM informes WHERE id=$1", [id]);
  const report = rows[0];
  if (!report) throw new HttpError(404, "Informe no encontrado.");
  if (user.rol === "TECNICO" && report.usuario_id !== user.id)
    throw new HttpError(403, "Este informe pertenece a otro técnico.");
  report.areas = (
    await db.query(
      "SELECT * FROM areas_informe WHERE informe_id=$1 ORDER BY orden",
      [id],
    )
  ).rows;
  for (const area of report.areas)
    area.materiales = (
      await db.query(
        `SELECT ma.*,r.nombre,r.unidad,r.descripcion,COALESCE(ma.especificaciones_override,(SELECT jsonb_agg(jsonb_build_object('nombre',e.nombre,'valor',e.valor) ORDER BY e.orden) FROM especificaciones_material e WHERE e.revision_id=ma.revision_id),'[]') AS especificaciones FROM materiales_area ma JOIN material_revisiones r ON r.id=ma.revision_id WHERE area_id=$1 ORDER BY ma.orden`,
        [area.id],
      )
    ).rows;
  report.costos = (
    await db.query(
      "SELECT descripcion,monto FROM costos_informe WHERE informe_id=$1 ORDER BY orden",
      [id],
    )
  ).rows;
  report.adjuntos = (
    await db.query(
      "SELECT descripcion FROM adjuntos WHERE informe_id=$1 ORDER BY orden",
      [id],
    )
  ).rows.map((r) => r.descripcion);
  report.historial = (
    await db.query(
      "SELECT h.accion,h.fecha,u.nombre FROM historial_informe h JOIN usuarios u ON u.id=h.usuario_id WHERE informe_id=$1 ORDER BY h.fecha DESC,h.id DESC",
      [id],
    )
  ).rows;
  return report;
}
export async function saveChildren(
  db: PoolClient,
  id: number,
  data: ReportInput,
) {
  await db.query("DELETE FROM areas_informe WHERE informe_id=$1", [id]);
  await db.query("DELETE FROM costos_informe WHERE informe_id=$1", [id]);
  await db.query("DELETE FROM adjuntos WHERE informe_id=$1", [id]);
  for (const [i, a] of data.areas.entries()) {
    const area = (
      await db.query(
        "INSERT INTO areas_informe(informe_id,nombre,destino,uso,orden) VALUES($1,$2,$3,$4,$5) RETURNING id",
        [id, a.nombre, a.destino, a.uso, i],
      )
    ).rows[0].id;
    for (const [j, m] of a.materiales.entries()) {
      const { rows } = await db.query(
        "SELECT m.revision_id,m.activo FROM materiales m WHERE id=$1",
        [m.material_id],
      );
      if (!rows[0]) throw new HttpError(400, "Un material ya no existe.");
      const revision = m.revision_id ?? rows[0].revision_id;
      if (!rows[0].activo && !m.revision_id)
        throw new HttpError(400, "No se pueden agregar materiales inactivos.");
      const valid = await db.query(
        "SELECT id FROM material_revisiones WHERE id=$1 AND material_id=$2",
        [revision, m.material_id],
      );
      if (!valid.rowCount)
        throw new HttpError(400, "Revisión de material inválida.");
      await db.query(
        "INSERT INTO materiales_area(area_id,material_id,revision_id,cantidad,especificaciones_override,orden) VALUES($1,$2,$3,$4,$5,$6)",
        [
          area,
          m.material_id,
          revision,
          m.cantidad,
          m.especificaciones_override == null
            ? null
            : JSON.stringify(m.especificaciones_override),
          j,
        ],
      );
    }
  }
  for (const [i, c] of data.costos.entries())
    await db.query(
      "INSERT INTO costos_informe(informe_id,descripcion,monto,orden) VALUES($1,$2,$3,$4)",
      [id, c.descripcion, c.monto, i],
    );
  for (const [i, a] of data.adjuntos.entries())
    await db.query(
      "INSERT INTO adjuntos(informe_id,descripcion,orden) VALUES($1,$2,$3)",
      [id, a, i],
    );
}
