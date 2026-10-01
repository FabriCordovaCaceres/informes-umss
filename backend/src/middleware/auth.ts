import { RequestHandler } from "express";
import { pool } from "../config/db.js";
import { hashToken } from "../utils/security.js";
import { HttpError } from "./errors.js";
export const authenticate: RequestHandler = async (req, res, next) => {
  const token = req.headers.authorization?.replace(/^Bearer /, "");
  if (!token) throw new HttpError(401, "Inicie sesión para continuar.");
  req.tokenHash = hashToken(token);
  const { rows } = await pool.query(
    "SELECT u.id,u.usuario,u.nombre,u.correo,u.cargo,u.activo,u.debe_cambiar_password,r.nombre AS rol FROM sesiones s JOIN usuarios u ON u.id=s.usuario_id JOIN roles r ON r.id=u.rol_id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.activo",
    [req.tokenHash],
  );
  if (!rows[0])
    throw new HttpError(401, "La sesión ha expirado. Ingrese nuevamente.");
  req.user = rows[0];
  next();
};
export const requirePasswordChangeCompleted: RequestHandler = (
  req,
  _res,
  next,
) => {
  if (req.user.debe_cambiar_password)
    throw new HttpError(403, "Debe cambiar su contraseña antes de continuar.");
  next();
};
export const roles =
  (...allowed: string[]): RequestHandler =>
  (req, res, next) => {
    if (!allowed.includes(req.user.rol))
      throw new HttpError(403, "No tiene permiso para esta acción.");
    next();
  };
