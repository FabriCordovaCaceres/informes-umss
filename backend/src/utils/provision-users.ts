import { randomBytes } from "node:crypto";
import { pool, transaction } from "../config/db.js";
import { hashPassword } from "./security.js";

const accounts = [
  { usuario: "tecnico1", nombre: "Técnico 1" },
  { usuario: "tecnico2", nombre: "Técnico 2" },
];

const created: { usuario: string; password: string }[] = [];
try {
  await transaction(async (db) => {
    const role = (await db.query("SELECT id FROM roles WHERE nombre='TECNICO'"))
      .rows[0]?.id;
    if (!role)
      throw new Error("Ejecute primero npm run migrate y npm run seed.");

    for (const account of accounts) {
      const existing = await db.query(
        "SELECT id FROM usuarios WHERE usuario=$1",
        [account.usuario],
      );
      if (existing.rowCount) continue;

      const password = randomBytes(24).toString("base64url");
      await db.query(
        "INSERT INTO usuarios(usuario,nombre,correo,cargo,rol_id,activo,password_hash,debe_cambiar_password) VALUES($1,$2,$3,'TÉCNICO DTIC',$4,true,$5,true)",
        [
          account.usuario,
          account.nombre,
          account.usuario + "@local.invalid",
          role,
          hashPassword(password),
        ],
      );
      created.push({ usuario: account.usuario, password });
    }
  });

  if (created.length) {
    console.log(
      "Credenciales temporales: entréguelas a cada usuario por separado.",
    );
    for (const account of created)
      console.log(`${account.usuario}: ${account.password}`);
    console.log(
      "Estas contraseñas se muestran una sola vez y no se guardan en texto plano.",
    );
  } else {
    console.log("Las dos cuentas ya existen. No se cambiaron sus contraseñas.");
  }
} finally {
  await pool.end();
}
