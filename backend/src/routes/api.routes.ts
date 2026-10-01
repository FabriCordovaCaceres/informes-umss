import { Router } from "express";
import {
  authenticate,
  requirePasswordChangeCompleted,
  roles,
} from "../middleware/auth.js";
import * as c from "../controllers/api.controller.js";
export const api = Router();
api.get("/health", (_req, res) =>
  res.json({ status: "ok", sistema: "Sistema de Informes Técnicos UMSS" }),
);
api.post("/auth/login", c.login);
api.use(authenticate);
api.get("/auth/me", (req, res) => res.json(req.user));
api.post("/auth/logout", c.logout);
api.post("/auth/change-password", c.changePassword);
api.use(requirePasswordChangeCompleted);
api.get("/materiales", c.listMaterials);
api.get("/materiales/:id", c.getMaterial);
api.post("/materiales", roles("ADMINISTRADOR"), c.saveMaterial);
api.put("/materiales/:id", roles("ADMINISTRADOR"), c.saveMaterial);
api.get("/informes", c.listReports);
api.get("/informes/siguiente", c.nextNumber);
api.get("/informes/:id", c.getReport);
api.post("/informes", c.saveReport);
api.put("/informes/:id", c.saveReport);
api.delete("/informes/:id", c.deleteReport);
api.post("/informes/:id/duplicar", c.duplicate);
api.get("/informes/:id/preview", c.getReport);
api.get("/informes/:id/pdf", c.document("pdf"));
api.get("/informes/:id/docx", c.document("docx"));
api.get("/usuarios", roles("ADMINISTRADOR"), c.users);
api.post("/usuarios", roles("ADMINISTRADOR"), c.saveUser);
api.put("/usuarios/:id", roles("ADMINISTRADOR"), c.saveUser);
api.get("/configuracion", c.config);
api.put("/configuracion", roles("ADMINISTRADOR"), c.saveConfig);
