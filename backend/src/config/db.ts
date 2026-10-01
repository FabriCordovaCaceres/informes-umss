import "dotenv/config";
import pg from "pg";
if (!process.env.DATABASE_URL)
  throw new Error("Configure DATABASE_URL en backend/.env");
pg.types.setTypeParser(1082, (value: string) => value);
pg.types.setTypeParser(1700, (value: string) => Number(value));
export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
export async function transaction<T>(
  work: (db: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    const result = await work(db);
    await db.query("COMMIT");
    return result;
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  } finally {
    db.release();
  }
}
