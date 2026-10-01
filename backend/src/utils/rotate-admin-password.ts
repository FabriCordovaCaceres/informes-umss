import { randomBytes } from "node:crypto";
import { pool, transaction } from "../config/db.js";
import { hashPassword } from "./security.js";

const password = randomBytes(24).toString("base64url");
try {
  await transaction(async (db) => {
    const updated = await db.query(
      "UPDATE usuarios SET password_hash=$1,debe_cambiar_password=true,updated_at=now() WHERE usuario='admin' AND activo RETURNING id",
      [hashPassword(password)],
    );
    if (!updated.rowCount)
      throw new Error("No existe una cuenta admin activa.");
    await db.query("DELETE FROM sesiones WHERE usuario_id=$1", [
      updated.rows[0].id,
    ]);
  });
  console.log("Nueva contraseña temporal de admin (se muestra una sola vez):");
  console.log(password);
} finally {
  await pool.end();
}
