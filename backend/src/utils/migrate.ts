import { readFile } from "node:fs/promises";
import { pool, transaction } from "../config/db.js";
try {
  await transaction(async (db) => {
    await db.query("SELECT pg_advisory_xact_lock(9172026)");
    await db.query(
      "CREATE TABLE IF NOT EXISTS schema_migrations (nombre text PRIMARY KEY,fecha timestamptz NOT NULL DEFAULT now())",
    );
    for (const name of ["001_initial", "002_force_password_change"]) {
      if (
        !(
          await db.query("SELECT 1 FROM schema_migrations WHERE nombre=$1", [
            name,
          ])
        ).rowCount
      ) {
        await db.query(
          await readFile(
            new URL(`../../../database/${name}.sql`, import.meta.url),
            "utf8",
          ),
        );
        await db.query("INSERT INTO schema_migrations(nombre) VALUES($1)", [
          name,
        ]);
      }
    }
  });
  console.log("Migraciones aplicadas.");
} finally {
  await pool.end();
}
