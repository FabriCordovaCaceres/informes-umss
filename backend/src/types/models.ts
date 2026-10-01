import { z } from "zod";
export const specSchema = z.object({
  nombre: z.string().trim().min(1).max(200),
  valor: z.string().trim().min(1).max(5000),
});
export const materialSchema = z.object({
  nombre: z.string().trim().min(1).max(500),
  unidad: z.string().trim().min(1).max(30),
  categoria: z.string().trim().min(1).max(120),
  descripcion: z.string().max(5000).default(""),
  activo: z.boolean().default(true),
  especificaciones: z.array(specSchema).max(100),
});
export const reportSchema = z.object({
  version: z.number().int().positive().optional(),
  remitente: z.string().max(300).default(""),
  cargo_remitente: z.string().max(300).default(""),
  destinatario: z.string().max(300).default(""),
  cargo_destinatario: z.string().max(300).default(""),
  referencia: z.string().max(2000).default(""),
  fecha: z.iso.date(),
  nota_solicitud: z.string().max(500).default(""),
  unidad_solicitante: z.string().max(500).default(""),
  introduccion: z.string().max(15000).default(""),
  conclusion: z.string().max(5000).default(""),
  estado: z.enum(["BORRADOR", "FINALIZADO"]).default("BORRADOR"),
  areas: z
    .array(
      z.object({
        nombre: z.string().max(300),
        destino: z.string().max(1000).default(""),
        uso: z.string().max(1000).default(""),
        materiales: z
          .array(
            z.object({
              material_id: z.number().int().positive(),
              revision_id: z.number().int().positive().optional(),
              cantidad: z.number().positive().max(999999999),
              especificaciones_override: z
                .array(specSchema)
                .max(100)
                .nullable()
                .optional(),
            }),
          )
          .max(200),
      }),
    )
    .max(100),
  costos: z
    .array(
      z.object({
        descripcion: z.string().trim().min(1).max(2000),
        monto: z.number().min(0).max(99999999999),
      }),
    )
    .max(100)
    .default([]),
  adjuntos: z.array(z.string().trim().min(1).max(2000)).max(100).default([]),
});
export type ReportInput = z.infer<typeof reportSchema>;
export type Spec = z.infer<typeof specSchema>;
export type User = {
  id: number;
  usuario: string;
  nombre: string;
  correo: string;
  cargo: string;
  rol: "ADMINISTRADOR" | "TECNICO" | "JEFE";
  activo: boolean;
  debe_cambiar_password: boolean;
};
export interface Report extends ReportInput {
  id: number;
  numero: number;
  gestion: number;
  codigo_completo: string;
  usuario_id: number;
  version: number;
  created_at: string;
  updated_at: string;
  areas: ReportArea[];
  historial: { accion: string; fecha: string; nombre: string }[];
}
export interface ReportArea {
  nombre: string;
  destino: string;
  uso: string;
  materiales: ReportLine[];
}
export interface ReportLine {
  material_id: number;
  revision_id: number;
  cantidad: number;
  nombre: string;
  unidad: string;
  descripcion: string;
  especificaciones: Spec[];
  especificaciones_override?: Spec[] | null;
}
declare global {
  namespace Express {
    interface Request {
      user: User;
      tokenHash: string;
    }
  }
}
