import { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof ZodError) {
    res
      .status(400)
      .json({
        message: "Revise los datos ingresados.",
        errors: err.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
      });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ message: err.message });
    return;
  }
  if (err.code === "23505") {
    res.status(409).json({ message: "Ya existe un registro con esos datos." });
    return;
  }
  if (err.type === "entity.parse.failed") {
    res.status(400).json({ message: "JSON inválido." });
    return;
  }
  console.error(err);
  res
    .status(500)
    .json({
      message:
        "No se pudo completar la operación. Revise la conexión y el registro del servidor.",
    });
};
