import { pool, transaction } from "../config/db.js";
import { materialSchema } from "../types/models.js";
import { HttpError } from "../middleware/errors.js";
const select = `SELECT m.*, COALESCE((SELECT jsonb_agg(jsonb_build_object('nombre',e.nombre,'valor',e.valor) ORDER BY e.orden) FROM especificaciones_material e WHERE e.revision_id=m.revision_id),'[]') AS especificaciones FROM materiales m`;
export async function listMaterials() {
  return (await pool.query(select + " ORDER BY m.nombre")).rows;
}
export async function getMaterial(id: number) {
  const { rows } = await pool.query(select + " WHERE m.id=$1", [id]);
  if (!rows[0]) throw new HttpError(404, "Material no encontrado.");
  return rows[0];
}
export async function saveMaterial(input: unknown, id?: number) {
  const m = materialSchema.parse(input);
  return transaction(async (db) => {
    let materialId = id;
    if (id) {
      const r = await db.query(
        "UPDATE materiales SET nombre=$2,unidad=$3,categoria=$4,descripcion=$5,activo=$6 WHERE id=$1 RETURNING id",
        [id, m.nombre, m.unidad, m.categoria, m.descripcion, m.activo],
      );
      if (!r.rowCount) throw new HttpError(404, "Material no encontrado.");
    } else
      materialId = (
        await db.query(
          "INSERT INTO materiales(nombre,unidad,categoria,descripcion,activo) VALUES($1,$2,$3,$4,$5) RETURNING id",
          [m.nombre, m.unidad, m.categoria, m.descripcion, m.activo],
        )
      ).rows[0].id;
    const revision = (
      await db.query(
        "INSERT INTO material_revisiones(material_id,nombre,unidad,descripcion) VALUES($1,$2,$3,$4) RETURNING id",
        [materialId, m.nombre, m.unidad, m.descripcion],
      )
    ).rows[0].id;
    for (const [i, s] of m.especificaciones.entries())
      await db.query(
        "INSERT INTO especificaciones_material(material_id,revision_id,nombre,valor,orden) VALUES($1,$2,$3,$4,$5)",
        [materialId, revision, s.nombre, s.valor, i],
      );
    await db.query("UPDATE materiales SET revision_id=$2 WHERE id=$1", [
      materialId,
      revision,
    ]);
    return { id: materialId, ...m, revision_id: revision };
  });
}
