import { RequestHandler } from "express";
import { z } from "zod";
import { pool, transaction } from "../config/db.js";
import {
  hashPassword,
  verifyPassword,
  sessionToken,
  hashToken,
} from "../utils/security.js";
import { HttpError } from "../middleware/errors.js";
import * as materials from "../repositories/materiales.repository.js";
import * as reports from "../repositories/informes.repository.js";
import * as service from "../services/informes.service.js";
import { generatePdf, generateDocx } from "../services/documentos.service.js";
const id = (value: unknown) => z.coerce.number().int().positive().parse(value);
const attempts = new Map<string, { count: number; until: number }>();
export const login: RequestHandler = async (req, res) => {
  const key = req.ip ?? "local";
  const now = Date.now();
  for (const [k, v] of attempts) if (v.until < now) attempts.delete(k);
  const entry = attempts.get(key) ?? { count: 0, until: now + 15 * 60 * 1000 };
  if (entry.count >= 10)
    throw new HttpError(429, "Demasiados intentos. Espere 15 minutos.");
  entry.count++;
  attempts.set(key, entry);
  const data = z
    .object({ usuario: z.string().max(200), password: z.string().max(200) })
    .parse(req.body);
  const { rows } = await pool.query(
    "SELECT u.*,r.nombre AS rol FROM usuarios u JOIN roles r ON r.id=u.rol_id WHERE u.usuario=$1 AND u.activo",
    [data.usuario],
  );
  const u = rows[0];
  if (!u || !verifyPassword(data.password, u.password_hash))
    throw new HttpError(401, "Usuario o contraseña incorrectos.");
  attempts.delete(key);
  const token = sessionToken();
  await pool.query(
    "INSERT INTO sesiones(token_hash,usuario_id,expires_at) VALUES($1,$2,now()+interval '8 hours')",
    [hashToken(token), u.id],
  );
  const { password_hash, ...user } = u;
  res.json({ token, user });
};
export const logout: RequestHandler = async (req, res) => {
  await pool.query("DELETE FROM sesiones WHERE token_hash=$1", [req.tokenHash]);
  res.sendStatus(204);
};
export const changePassword: RequestHandler = async (req, res) => {
  const data = z
    .object({
      password_actual: z.string().min(1).max(200),
      password_nueva: z.string().min(15).max(200),
    })
    .parse(req.body);
  await transaction(async (db) => {
    const result = await db.query(
      "SELECT password_hash FROM usuarios WHERE id=$1 FOR UPDATE",
      [req.user.id],
    );
    const oldHash = result.rows[0]?.password_hash;
    if (!oldHash || !verifyPassword(data.password_actual, oldHash))
      throw new HttpError(400, "La contraseña actual no es correcta.");
    if (verifyPassword(data.password_nueva, oldHash))
      throw new HttpError(400, "La contraseña nueva debe ser diferente.");
    await db.query(
      "UPDATE usuarios SET password_hash=$2,debe_cambiar_password=false,updated_at=now() WHERE id=$1",
      [req.user.id, hashPassword(data.password_nueva)],
    );
    await db.query(
      "DELETE FROM sesiones WHERE usuario_id=$1 AND token_hash<>$2",
      [req.user.id, req.tokenHash],
    );
  });
  res.json({ debe_cambiar_password: false });
};
export const listMaterials: RequestHandler = async (req, res) => {
  res.json(await materials.listMaterials());
};
export const getMaterial: RequestHandler = async (req, res) => {
  res.json(await materials.getMaterial(id(req.params.id)));
};
export const saveMaterial: RequestHandler = async (req, res) => {
  res
    .status(req.params.id ? 200 : 201)
    .json(
      await materials.saveMaterial(
        req.body,
        req.params.id ? id(req.params.id) : undefined,
      ),
    );
};
export const listReports: RequestHandler = async (req, res) => {
  res.json(await reports.listReports(req.user));
};
export const getReport: RequestHandler = async (req, res) => {
  res.json(await reports.getReport(id(req.params.id), req.user));
};
export const saveReport: RequestHandler = async (req, res) => {
  res
    .status(req.params.id ? 200 : 201)
    .json(
      await service.saveReport(
        req.body,
        req.user,
        req.params.id ? id(req.params.id) : undefined,
      ),
    );
};
export const duplicate: RequestHandler = async (req, res) => {
  res
    .status(201)
    .json(await service.duplicateReport(id(req.params.id), req.user));
};
export const deleteReport: RequestHandler = async (req, res) => {
  await service.deleteReport(id(req.params.id), req.user);
  res.sendStatus(204);
};
export const nextNumber: RequestHandler = async (req, res) => {
  res.json(
    await service.nextNumber(
      z.coerce.number().int().min(1900).max(9999).parse(req.query.gestion),
    ),
  );
};
export const document =
  (format: "pdf" | "docx"): RequestHandler =>
  async (req, res) => {
    const r = await reports.getReport(id(req.params.id), req.user);
    service.validateFinal(r);
    const buffer =
      format === "pdf" ? await generatePdf(r) : await generateDocx(r);
    await pool.query(
      "INSERT INTO historial_informe(informe_id,usuario_id,accion) VALUES($1,$2,$3)",
      [
        r.id,
        req.user.id,
        `Documento ${format.toUpperCase()} generado (${r.estado})`,
      ],
    );
    res.setHeader(
      "Content-Type",
      format === "pdf"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Informe-${r.numero}-${r.gestion}.${format}"`,
    );
    res.send(buffer);
  };
export const users: RequestHandler = async (req, res) => {
  res.json(
    (
      await pool.query(
        "SELECT u.id,u.usuario,u.nombre,u.correo,u.cargo,u.activo,u.debe_cambiar_password,r.nombre AS rol FROM usuarios u JOIN roles r ON r.id=u.rol_id ORDER BY u.nombre",
      )
    ).rows,
  );
};
const userSchema = z.object({
  usuario: z.string().trim().min(3).max(100),
  nombre: z.string().trim().min(1).max(300),
  correo: z.email(),
  cargo: z.string().trim().min(1).max(300),
  rol: z.enum(["ADMINISTRADOR", "TECNICO", "JEFE"]),
  activo: z.boolean(),
  password: z.string().min(15).max(200).optional(),
});
export const saveUser: RequestHandler = async (req, res) => {
  const d = userSchema.parse(req.body);
  const uid = req.params.id ? id(req.params.id) : undefined;
  if (uid === req.user.id && (!d.activo || d.rol !== "ADMINISTRADOR"))
    throw new HttpError(
      400,
      "No puede desactivar su propia cuenta ni quitarse el rol de administrador.",
    );
  if (uid === req.user.id && d.password)
    throw new HttpError(400, "Cambie su propia contraseña desde Mi cuenta.");
  const saved = await transaction(async (db) => {
    const role = (
      await db.query("SELECT id FROM roles WHERE nombre=$1", [d.rol])
    ).rows[0].id;
    if (uid) {
      const r = await db.query(
        "UPDATE usuarios SET usuario=$2,nombre=$3,correo=$4,cargo=$5,rol_id=$6,activo=$7,updated_at=now() WHERE id=$1 RETURNING id",
        [uid, d.usuario, d.nombre, d.correo, d.cargo, role, d.activo],
      );
      if (!r.rowCount) throw new HttpError(404, "Usuario no encontrado.");
      if (d.password)
        await db.query(
          "UPDATE usuarios SET password_hash=$2,debe_cambiar_password=$3 WHERE id=$1",
          [uid, hashPassword(d.password), true],
        );
      await db.query(
        "DELETE FROM sesiones WHERE usuario_id=$1 AND token_hash<>$2",
        [uid, req.tokenHash],
      );
      return uid;
    }
    if (!d.password)
      throw new HttpError(
        400,
        "Ingrese una contraseña de al menos 15 caracteres.",
      );
    return (
      await db.query(
        "INSERT INTO usuarios(usuario,nombre,correo,cargo,rol_id,activo,password_hash,debe_cambiar_password) VALUES($1,$2,$3,$4,$5,$6,$7,true) RETURNING id",
        [
          d.usuario,
          d.nombre,
          d.correo,
          d.cargo,
          role,
          d.activo,
          hashPassword(d.password),
        ],
      )
    ).rows[0].id;
  });
  res.status(uid ? 200 : 201).json({ id: saved });
};
export const config: RequestHandler = async (req, res) => {
  res.json(
    (await pool.query("SELECT datos FROM configuracion WHERE id=1")).rows[0]
      ?.datos ?? {},
  );
};
export const saveConfig: RequestHandler = async (req, res) => {
  const data = z
    .object({
      remitente: z.string().max(300),
      cargo_remitente: z.string().max(300),
      destinatario: z.string().max(300),
      cargo_destinatario: z.string().max(300),
      introduccion: z.string().max(15000),
      conclusion: z.string().max(5000),
    })
    .parse(req.body);
  await pool.query(
    "INSERT INTO configuracion(id,datos) VALUES(1,$1) ON CONFLICT(id) DO UPDATE SET datos=EXCLUDED.datos",
    [JSON.stringify(data)],
  );
  res.json(data);
};
