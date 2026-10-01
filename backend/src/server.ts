import "dotenv/config";
import express from "express";
import { api } from "./routes/api.routes.js";
import { errorHandler } from "./middleware/errors.js";
import { pool } from "./config/db.js";
export const app = express();
app.disable("x-powered-by");
app.use((req, res, next) => {
  const allowed = process.env.FRONTEND_ORIGIN ?? "http://localhost:4200";
  if (req.headers.origin === allowed) {
    res.setHeader("Access-Control-Allow-Origin", allowed);
    res.setHeader("Vary", "Origin");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization",
    );
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,DELETE,OPTIONS",
    );
  }
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});
app.use(express.json({ limit: "4mb" }));
app.use("/api", api);
app.use((_req, res) =>
  res.status(404).json({ message: "Ruta no encontrada." }),
);
app.use(errorHandler);
await pool.query("SELECT 1");
const server = app.listen(
  Number(process.env.PORT ?? 3000),
  process.env.HOST ?? "127.0.0.1",
  () =>
    console.log(
      `API UMSS disponible en http://${process.env.HOST ?? "127.0.0.1"}:${process.env.PORT ?? 3000}/api`,
    ),
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => {
    server.close(() => {
      void pool.end().then(() => process.exit(0));
    });
  });
